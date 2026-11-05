import { OrderStatus } from '../generated/prisma/enums';
import { toDashboard, toNumber, type DashboardRaw } from './dashboard.mapper';
import { buildDashboardRange } from './dashboard.range';

// 3 ngày: 2026-11-03..05; kỳ trước 2026-10-31..11-02
const range = buildDashboardRange('2026-11-03', '2026-11-05');

const raw = (over: Partial<DashboardRaw> = {}): DashboardRaw => ({
  range,
  revenueRows: [],
  orderRows: [],
  customerRows: [],
  statusRows: [],
  topRows: [],
  lowRows: [],
  lowTotal: 0,
  pendingRows: [],
  ...over,
});

describe('toNumber', () => {
  it('ép BigInt, chuỗi Decimal, null về number', () => {
    expect(toNumber(BigInt(1234567))).toBe(1234567);
    expect(toNumber('847000')).toBe(847000);
    expect(toNumber(null)).toBe(0);
  });
});

describe('toDashboard', () => {
  it('không có dữ liệu: đủ ngày bằng 0, AOV 0, đủ 7 trạng thái', () => {
    const r = toDashboard(raw());
    expect(r.series).toHaveLength(3);
    expect(r.previousSeries).toHaveLength(3);
    expect(r.series.every((p) => p.revenue === 0 && p.orderCount === 0)).toBe(
      true,
    );
    expect(r.current).toEqual({
      revenue: 0,
      orderCount: 0,
      averageOrderValue: 0,
      newCustomers: 0,
    });
    expect(r.statusCounts).toHaveLength(7);
    expect(r.statusCounts.map((s) => s.status)).toEqual(
      Object.values(OrderStatus),
    );
    expect(r.statusCounts.every((s) => s.count === 0)).toBe(true);
  });

  it('tách một truy vấn theo ngày thành kỳ này và kỳ trước, tổng series = thẻ KPI', () => {
    const r = toDashboard(
      raw({
        revenueRows: [
          { d: '2026-11-05', revenue: '847000', completed: BigInt(1) },
          { d: '2026-11-03', revenue: BigInt(300000), completed: 2 },
          { d: '2026-11-01', revenue: 500000, completed: 1 },
        ],
        orderRows: [
          { d: '2026-11-05', n: BigInt(3) },
          { d: '2026-11-01', n: 2 },
        ],
        customerRows: [{ d: '2026-11-04', n: '4' }],
      }),
    );
    expect(r.series.map((p) => p.revenue)).toEqual([300000, 0, 847000]);
    expect(r.previousSeries.map((p) => p.revenue)).toEqual([0, 500000, 0]);
    expect(r.current.revenue).toBe(1147000);
    expect(r.current.revenue).toBe(r.series.reduce((s, p) => s + p.revenue, 0));
    expect(r.current.orderCount).toBe(3);
    expect(r.current.newCustomers).toBe(4);
    expect(r.previous.revenue).toBe(500000);
    expect(r.previous.orderCount).toBe(2);
  });

  it('AOV = doanh thu / số đơn COMPLETED (không chia cho mọi đơn), làm tròn', () => {
    const r = toDashboard(
      raw({
        revenueRows: [
          { d: '2026-11-03', revenue: 1000, completed: 1 },
          { d: '2026-11-04', revenue: 1000, completed: 2 },
        ],
        // 10 đơn đặt nhưng chỉ 3 hoàn thành: AOV phải là 2000/3, không phải 2000/10
        orderRows: [{ d: '2026-11-03', n: 10 }],
      }),
    );
    expect(r.current.averageOrderValue).toBe(667);
  });

  it('statusCounts theo thứ tự enum, trạng thái thiếu = 0', () => {
    const r = toDashboard(
      raw({
        statusRows: [
          { status: OrderStatus.COMPLETED, _count: { _all: 5 } },
          { status: OrderStatus.PENDING, _count: { _all: 2 } },
        ],
      }),
    );
    expect(r.statusCounts.find((s) => s.status === 'COMPLETED')?.count).toBe(5);
    expect(r.statusCounts.find((s) => s.status === 'PENDING')?.count).toBe(2);
    expect(
      r.statusCounts.find((s) => s.status === 'PENDING_PAYMENT')?.count,
    ).toBe(0);
    expect(r.statusCounts).toHaveLength(7);
  });

  it('top sản phẩm ép số, ảnh thiếu thì null; sắp hết hàng tính available = stock - reserved', () => {
    const r = toDashboard(
      raw({
        topRows: [
          {
            id: 1,
            name: 'Áo',
            imageUrl: null,
            quantitySold: '7',
            revenue: BigInt(1813000),
          },
        ],
        lowRows: [
          {
            id: 9,
            productId: 1,
            productName: 'Áo',
            sku: 'A-M',
            size: 'M',
            color: 'Đen',
            stock: 6,
            reserved: 4,
            minStock: 8,
          },
        ],
        lowTotal: 26,
      }),
    );
    expect(r.topProducts[0]).toEqual({
      id: 1,
      name: 'Áo',
      imageUrl: null,
      quantitySold: 7,
      revenue: 1813000,
    });
    expect(r.lowStockVariants.total).toBe(26);
    expect(r.lowStockVariants.items[0].available).toBe(2);
  });

  it('range và previousRange trả đúng, không lộ ranh giới UTC', () => {
    const r = toDashboard(raw());
    expect(r.range).toEqual({ from: '2026-11-03', to: '2026-11-05', days: 3 });
    expect(r.previousRange).toEqual({ from: '2026-10-31', to: '2026-11-02' });
  });
});
