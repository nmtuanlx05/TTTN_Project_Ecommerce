import { OrderStatus } from '../generated/prisma/enums';
import type {
  CountDayRow,
  LowStockRow,
  RevenueDayRow,
  TopProductRow,
} from './dashboard.queries';
import type { DashboardRange } from './dashboard.range';

// COUNT/SUM trong MySQL trả BigInt hoặc Decimal (chuỗi) nên phải ép về number
export const toNumber = (value: bigint | number | string | null | undefined) =>
  Number(value ?? 0);

export interface DailyPoint {
  date: string;
  revenue: number;
  orderCount: number;
  newCustomers: number;
}

export interface KpiSnapshot {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  newCustomers: number;
}

export interface PendingOrderRow {
  id: number;
  code: string;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: Date;
}

export interface DashboardRaw {
  range: DashboardRange;
  revenueRows: RevenueDayRow[];
  orderRows: CountDayRow[];
  customerRows: CountDayRow[];
  statusRows: {
    status: OrderStatus;
    _count?: true | { _all?: number };
  }[];
  topRows: TopProductRow[];
  lowRows: LowStockRow[];
  lowTotal: number;
  pendingRows: PendingOrderRow[];
}

const byDate = <T extends { d: string }>(
  rows: T[],
  pick: (row: T) => number,
) => {
  const map = new Map<string, number>();
  for (const row of rows) {
    // Cộng dồn phòng khi driver trả cùng ngày hai lần
    map.set(String(row.d), (map.get(String(row.d)) ?? 0) + pick(row));
  }
  return map;
};

// Đủ mọi ngày của kỳ (ngày không có số liệu = 0) vì giao diện ghép kỳ trước theo chỉ số
function buildSeries(
  dates: string[],
  revenue: Map<string, number>,
  orders: Map<string, number>,
  customers: Map<string, number>,
): DailyPoint[] {
  return dates.map((date) => ({
    date,
    revenue: revenue.get(date) ?? 0,
    orderCount: orders.get(date) ?? 0,
    newCustomers: customers.get(date) ?? 0,
  }));
}

// KPI luôn cộng từ chính chuỗi theo ngày nên tổng biểu đồ và thẻ số liệu không thể lệch nhau
function summarise(series: DailyPoint[], completedCount: number): KpiSnapshot {
  const revenue = series.reduce((sum, p) => sum + p.revenue, 0);
  return {
    revenue,
    orderCount: series.reduce((sum, p) => sum + p.orderCount, 0),
    // AOV = doanh thu / số đơn COMPLETED trong kỳ; không có đơn thì 0
    averageOrderValue:
      completedCount === 0 ? 0 : Math.round(revenue / completedCount),
    newCustomers: series.reduce((sum, p) => sum + p.newCustomers, 0),
  };
}

const sumOver = (dates: string[], map: Map<string, number>) =>
  dates.reduce((sum, date) => sum + (map.get(date) ?? 0), 0);

export function toDashboard(raw: DashboardRaw) {
  const { range } = raw;
  const revenue = byDate(raw.revenueRows, (r) => toNumber(r.revenue));
  const completed = byDate(raw.revenueRows, (r) => toNumber(r.completed));
  const orders = byDate(raw.orderRows, (r) => toNumber(r.n));
  const customers = byDate(raw.customerRows, (r) => toNumber(r.n));

  const series = buildSeries(range.dates, revenue, orders, customers);
  const previousSeries = buildSeries(
    range.previousDates,
    revenue,
    orders,
    customers,
  );

  // Đủ mọi trạng thái, kể cả 0, theo thứ tự enum
  const counts = new Map(
    raw.statusRows.map(
      (r) =>
        [
          r.status,
          typeof r._count === 'object' ? (r._count._all ?? 0) : 0,
        ] as const,
    ),
  );
  const statusCounts = Object.values(OrderStatus).map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));

  return {
    range: { from: range.from, to: range.to, days: range.days },
    previousRange: { from: range.previousFrom, to: range.previousTo },
    current: summarise(series, sumOver(range.dates, completed)),
    previous: summarise(
      previousSeries,
      sumOver(range.previousDates, completed),
    ),
    series,
    previousSeries,
    statusCounts,
    topProducts: raw.topRows.map((r) => ({
      id: r.id,
      name: r.name,
      imageUrl: r.imageUrl ?? null,
      quantitySold: toNumber(r.quantitySold),
      revenue: toNumber(r.revenue),
    })),
    lowStockVariants: {
      total: raw.lowTotal,
      items: raw.lowRows.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        size: r.size,
        color: r.color,
        stock: r.stock,
        reserved: r.reserved,
        available: r.stock - r.reserved,
        minStock: r.minStock,
      })),
    },
    pendingOrders: raw.pendingRows.map((r) => ({
      id: r.id,
      code: r.code,
      customerName: r.customerName,
      totalAmount: r.totalAmount,
      status: r.status,
      paymentStatus: r.paymentStatus,
      createdAt: r.createdAt,
    })),
  };
}
