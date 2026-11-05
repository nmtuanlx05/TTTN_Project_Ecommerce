import type { OrderStatus } from "@/components/ui/badge"

/**
 * Kiểu phản hồi của `GET /admin/dashboard` (backend src/dashboard/dashboard.mapper.ts). Tiền là VND, số nguyên.
 * Ngày là chuỗi YYYY-MM-DD theo GMT+7; `createdAt` là ISO UTC.
 */

export type { OrderStatus }

/** `FAILED` chưa có trong `PaymentStatus` của ui/badge (xem recent-orders.tsx). */
export type DashboardPaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "FAILED"

export type DailyPoint = {
  date: string
  /** Doanh thu đơn COMPLETED, theo ngày hoàn thành đơn */
  revenue: number
  /** Số đơn đặt, mọi trạng thái, theo ngày đặt */
  orderCount: number
  newCustomers: number
}

export type KpiSnapshot = {
  revenue: number
  orderCount: number
  /** Doanh thu ÷ số đơn COMPLETED; 0 khi không có đơn */
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
  imageUrl: string | null
  quantitySold: number
  /** Giá × số lượng, trước giảm giá voucher và phí ship */
  revenue: number
}

export type LowStockVariant = {
  id: number
  productId: number
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
  /** Tên người nhận */
  customerName: string
  totalAmount: number
  status: OrderStatus
  paymentStatus: DashboardPaymentStatus
  createdAt: string
}

export type DashboardData = {
  range: { from: string; to: string; days: number }
  previousRange: { from: string; to: string }
  current: KpiSnapshot
  previous: KpiSnapshot
  series: DailyPoint[]
  previousSeries: DailyPoint[]
  statusCounts: OrderStatusCount[]
  topProducts: TopProduct[]
  lowStockVariants: { total: number; items: LowStockVariant[] }
  pendingOrders: PendingOrder[]
}
