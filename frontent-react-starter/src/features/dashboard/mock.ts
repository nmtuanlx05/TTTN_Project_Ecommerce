import { startOfDay, subDays } from "date-fns"
import type { OrderStatus, PaymentStatus } from "@/components/ui/badge"
import { dayCount, previousRange, type DateRange } from "@/lib/date-range"

/**
 * Dữ liệu hardcode cho /admin/dashboard.
 *
 * Toàn bộ trang chỉ gọi `getDashboardData(range)`. Khi backend xong, thay thân
 * hàm đó bằng lệnh gọi API — các kiểu bên dưới chính là hợp đồng dữ liệu, và
 * không component nào phải sửa.
 *
 * Quy tắc nghiệp vụ đã bám theo:
 * - FR-33: doanh thu CHỈ cộng `totalAmount` của đơn COMPLETED.
 * - Tồn khả dụng = stock − reserved (docs/05-data-models.md).
 * - Mã đơn theo định dạng trong prisma/schema.prisma: DH20261005-0001.
 */

/* --------------------------------- Kiểu ---------------------------------- */

export type DailyPoint = {
  /** yyyy-MM-dd */
  date: string
  /** Doanh thu trong ngày, chỉ tính đơn COMPLETED */
  revenue: number
  /** Số đơn đặt trong ngày, mọi trạng thái */
  orderCount: number
  /** Khách đăng ký mới trong ngày */
  newCustomers: number
}

export type KpiSnapshot = {
  revenue: number
  orderCount: number
  averageOrderValue: number
  newCustomers: number
}

export type OrderStatusCount = {
  status: OrderStatus
  count: number
}

export type TopProduct = {
  id: number
  name: string
  sku: string
  quantitySold: number
  revenue: number
}

export type LowStockVariant = {
  id: number
  productName: string
  sku: string
  size: string
  color: string
  stock: number
  reserved: number
  /** stock − reserved */
  available: number
  minStock: number
}

export type PendingOrder = {
  id: number
  code: string
  customerName: string
  totalAmount: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  createdAt: string
}

export type DashboardData = {
  series: DailyPoint[]
  previousSeries: DailyPoint[]
  current: KpiSnapshot
  previous: KpiSnapshot
  statusCounts: OrderStatusCount[]
  topProducts: TopProduct[]
  lowStockVariants: LowStockVariant[]
  pendingOrders: PendingOrder[]
}

/* ------------------------- Sinh chuỗi theo ngày --------------------------- */

const HISTORY_DAYS = 160

/** Nhiễu tất định — reload không làm số liệu nhảy. */
function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function buildDailyPoint(date: Date, index: number): DailyPoint {
  const weekday = date.getDay() // 0 = Chủ nhật
  const isWeekend = weekday === 0 || weekday === 6

  // Nền 11–14 triệu, cuối tuần nhân 1,55; cộng xu hướng tăng nhẹ theo thời gian
  const base = 11_000_000 + noise(index) * 3_000_000
  const weekendBoost = isWeekend ? 1.55 : 1
  const trend = 1 + index / HISTORY_DAYS / 2.2
  const spike = noise(index * 3.1) > 0.93 ? 1.45 : 1

  const revenue =
    Math.round((base * weekendBoost * trend * spike) / 100_000) * 100_000

  const orderCount = Math.max(
    4,
    Math.round(revenue / (1_900_000 + noise(index * 7.7) * 700_000)),
  )

  const newCustomers = Math.max(0, Math.round(orderCount * (0.2 + noise(index * 5.3) * 0.2)))

  return {
    date: toIsoDate(date),
    revenue,
    orderCount,
    newCustomers,
  }
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** Lịch sử đủ dài để mọi preset đều có cả kỳ hiện tại lẫn kỳ trước. */
const HISTORY: DailyPoint[] = (() => {
  const today = startOfDay(new Date())
  return Array.from({ length: HISTORY_DAYS }, (_, offset) => {
    const index = HISTORY_DAYS - 1 - offset
    return buildDailyPoint(subDays(today, index), offset)
  })
})()

function sliceRange(range: DateRange): DailyPoint[] {
  const from = toIsoDate(range.from)
  const to = toIsoDate(range.to)
  return HISTORY.filter((point) => point.date >= from && point.date <= to)
}

function summarise(points: DailyPoint[]): KpiSnapshot {
  const revenue = points.reduce((sum, point) => sum + point.revenue, 0)
  const orderCount = points.reduce((sum, point) => sum + point.orderCount, 0)
  const newCustomers = points.reduce((sum, point) => sum + point.newCustomers, 0)
  return {
    revenue,
    orderCount,
    averageOrderValue: orderCount === 0 ? 0 : Math.round(revenue / orderCount),
    newCustomers,
  }
}

/* --------------------------- Đơn theo trạng thái -------------------------- */

/**
 * Tỉ trọng 7 trạng thái trên tổng đơn của kỳ. Phần lớn đơn đã kết thúc; số đơn
 * còn đang chạy trong pipeline nhỏ và gần như không đổi theo độ dài khoảng.
 */
const STATUS_SHARE: { status: OrderStatus; share: number }[] = [
  { status: "PENDING", share: 0.045 },
  { status: "CONFIRMED", share: 0.062 },
  { status: "PACKING", share: 0.048 },
  { status: "SHIPPING", share: 0.091 },
  { status: "COMPLETED", share: 0.681 },
  { status: "CANCELLED", share: 0.049 },
  { status: "RETURNED", share: 0.024 },
]

function buildStatusCounts(totalOrders: number): OrderStatusCount[] {
  const counts = STATUS_SHARE.map(({ status, share }) => ({
    status,
    count: Math.round(totalOrders * share),
  }))

  // Dồn sai số làm tròn vào COMPLETED để tổng khớp đúng số đơn
  const diff = totalOrders - counts.reduce((sum, item) => sum + item.count, 0)
  const completed = counts.find((item) => item.status === "COMPLETED")
  if (completed) completed.count = Math.max(0, completed.count + diff)

  return counts
}

/* ----------------------------- Danh sách tĩnh ----------------------------- */

type TopProductSeed = {
  id: number
  name: string
  sku: string
  unitPrice: number
  /** Số lượng bán trung bình mỗi ngày */
  dailyRate: number
}

const TOP_PRODUCTS: TopProductSeed[] = [
  { id: 1, name: "Áo sơ mi linen tay dài", sku: "ASM-LIN-01", unitPrice: 549_000, dailyRate: 2.1 },
  { id: 2, name: "Quần tây ống suông", sku: "QT-SUONG-02", unitPrice: 689_000, dailyRate: 1.7 },
  { id: 3, name: "Áo thun cotton bo cổ", sku: "AT-COT-05", unitPrice: 259_000, dailyRate: 3.4 },
  { id: 4, name: "Chân váy xếp ly midi", sku: "CV-XLY-03", unitPrice: 479_000, dailyRate: 1.4 },
  { id: 5, name: "Áo khoác dù hai lớp", sku: "AK-DU-07", unitPrice: 899_000, dailyRate: 1.1 },
]

function buildTopProducts(days: number): TopProduct[] {
  return TOP_PRODUCTS.map((product) => {
    const quantitySold = Math.round(product.dailyRate * days)
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      quantitySold,
      revenue: quantitySold * product.unitPrice,
    }
  }).sort((a, b) => b.revenue - a.revenue)
}

/** Tồn kho là trạng thái hiện tại, không phụ thuộc khoảng thời gian đang xem. */
const LOW_STOCK_VARIANTS: LowStockVariant[] = [
  {
    id: 101,
    productName: "Áo khoác dù hai lớp",
    sku: "AK-DU-07-M-DEN",
    size: "M",
    color: "Đen",
    stock: 6,
    reserved: 6,
    available: 0,
    minStock: 8,
  },
  {
    id: 102,
    productName: "Áo sơ mi linen tay dài",
    sku: "ASM-LIN-01-L-TRG",
    size: "L",
    color: "Trắng ngà",
    stock: 4,
    reserved: 4,
    available: 0,
    minStock: 10,
  },
  {
    id: 103,
    productName: "Quần tây ống suông",
    sku: "QT-SUONG-02-29-XAM",
    size: "29",
    color: "Xám tro",
    stock: 9,
    reserved: 7,
    available: 2,
    minStock: 10,
  },
  {
    id: 104,
    productName: "Chân váy xếp ly midi",
    sku: "CV-XLY-03-S-BE",
    size: "S",
    color: "Be",
    stock: 7,
    reserved: 4,
    available: 3,
    minStock: 8,
  },
  {
    id: 105,
    productName: "Áo thun cotton bo cổ",
    sku: "AT-COT-05-XL-NAV",
    size: "XL",
    color: "Xanh navy",
    stock: 11,
    reserved: 7,
    available: 4,
    minStock: 12,
  },
]

/** Đơn cần xử lý cũng là trạng thái hiện tại, không lọc theo khoảng. */
function buildPendingOrders(): PendingOrder[] {
  const now = new Date()
  const minutesAgo = (minutes: number) =>
    new Date(now.getTime() - minutes * 60_000).toISOString()

  const stamp = toIsoDate(now).replace(/-/g, "")

  return [
    {
      id: 1,
      code: `DH${stamp}-0148`,
      customerName: "Nguyễn Mạnh Tuấn",
      totalAmount: 1_290_000,
      status: "PENDING",
      paymentStatus: "UNPAID",
      createdAt: minutesAgo(12),
    },
    {
      id: 2,
      code: `DH${stamp}-0147`,
      customerName: "Trần Thị Mỹ Dung",
      totalAmount: 785_000,
      status: "PENDING",
      paymentStatus: "PAID",
      createdAt: minutesAgo(38),
    },
    {
      id: 3,
      code: `DH${stamp}-0146`,
      customerName: "Lê Hoàng Phúc",
      totalAmount: 2_430_000,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      createdAt: minutesAgo(96),
    },
    {
      id: 4,
      code: `DH${stamp}-0145`,
      customerName: "Phạm Khánh Vy",
      totalAmount: 559_000,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      createdAt: minutesAgo(141),
    },
    {
      id: 5,
      code: `DH${stamp}-0144`,
      customerName: "Đặng Quốc Việt",
      totalAmount: 3_180_000,
      status: "PACKING",
      paymentStatus: "PAID",
      createdAt: minutesAgo(205),
    },
    {
      id: 6,
      code: `DH${stamp}-0143`,
      customerName: "Vũ Thị Ánh Nguyệt",
      totalAmount: 940_000,
      status: "PACKING",
      paymentStatus: "UNPAID",
      createdAt: minutesAgo(268),
    },
  ]
}

/* ------------------------------ Điểm vào duy nhất ------------------------- */

export function getDashboardData(range: DateRange): DashboardData {
  const series = sliceRange(range)
  const previousSeries = sliceRange(previousRange(range))
  const current = summarise(series)

  return {
    series,
    previousSeries,
    current,
    previous: summarise(previousSeries),
    statusCounts: buildStatusCounts(current.orderCount),
    topProducts: buildTopProducts(dayCount(range)),
    lowStockVariants: LOW_STOCK_VARIANTS,
    pendingOrders: buildPendingOrders(),
  }
}

/** Giả lập độ trễ mạng khi đổi khoảng thời gian. */
export const MOCK_LATENCY_MS = 600
