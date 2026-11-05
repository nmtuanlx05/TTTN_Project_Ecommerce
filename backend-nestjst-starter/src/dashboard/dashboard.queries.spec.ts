import { buildDashboardRange } from './dashboard.range';
import {
  buildLowStockQuery,
  buildNewCustomersByDayQuery,
  buildOrdersByDayQuery,
  buildRevenueByDayQuery,
  buildTopProductsQuery,
} from './dashboard.queries';

const range = buildDashboardRange('2026-11-05', '2026-11-05');
const gte = '2026-11-04 17:00:00.000';
const lt = '2026-11-05 17:00:00.000';

// Chỉ kiểm chuỗi/tham số SQL (không chạy DB): xem mục "Chưa kiểm chứng" trong docs/api/dashboard.md
describe('dashboard.queries', () => {
  it('doanh thu: tham số hóa mốc UTC và trạng thái, ngày trả bằng DATE_FORMAT +7 giờ', () => {
    const q = buildRevenueByDayQuery(range.current);
    expect(q.sql).toContain(
      "DATE_FORMAT(DATE_ADD(c.completedAt, INTERVAL 7 HOUR), '%Y-%m-%d')",
    );
    expect(q.sql).toContain('COALESCE(h.completedAt, o.paidAt, o.updatedAt)');
    expect(q.sql).toContain('MIN(createdAt)');
    // Trạng thái COMPLETED (lịch sử + đơn) và hai mốc thời gian đều là tham số ràng buộc
    expect(q.values).toEqual(['COMPLETED', 'COMPLETED', gte, lt]);
    expect(q.sql).not.toContain('2026-');
  });

  it('số đơn và khách mới lọc theo createdAt nửa mở [gte, lt)', () => {
    const orders = buildOrdersByDayQuery(range.current);
    expect(orders.sql).toMatch(/createdAt >= \? AND createdAt < \?/);
    expect(orders.values).toEqual([gte, lt]);

    const users = buildNewCustomersByDayQuery(range.current);
    expect(users.sql).toContain("role = 'CUSTOMER'");
    expect(users.values).toEqual([gte, lt]);
  });

  it('top sản phẩm: chỉ đơn COMPLETED, xếp theo quantitySold giảm dần, LIMIT 5 là tham số', () => {
    const q = buildTopProductsQuery(range.current);
    expect(q.sql).toContain('ORDER BY quantitySold DESC');
    expect(q.sql).toContain('JOIN product_variants pv');
    expect(q.values).toEqual(['COMPLETED', 'COMPLETED', gte, lt, 5]);
  });

  it('sắp hết hàng: available <= minStock, chỉ biến thể và sản phẩm đang bật', () => {
    const q = buildLowStockQuery();
    expect(q.sql).toContain('(pv.stock - pv.reserved) <= pv.minStock');
    expect(q.sql).toContain('pv.isActive = 1 AND p.isActive = 1');
    expect(q.values).toEqual([5]);
  });
});
