import { Prisma } from '../generated/prisma/client';
import { OrderStatus } from '../generated/prisma/enums';
import { VN_UTC_OFFSET_HOURS } from '../orders/orders.constants';
import { LOW_STOCK_LIMIT, TOP_PRODUCTS_LIMIT } from './dashboard.constants';
import { toSqlUtc, type UtcBounds } from './dashboard.range';

// SQL thô cho các phép gom theo ngày/so sánh cột vì Prisma không gom theo ngày GMT+7 và không viết được stock - reserved.
// Quy tắc an toàn:
// - Mọi giá trị đổi được đi qua ${} của Prisma.sql (tham số ràng buộc); Prisma.raw chỉ dùng cho hằng số số nguyên của mã nguồn.
// - Mốc thời gian là chuỗi UTC 'YYYY-MM-DD HH:mm:ss.SSS' lấy từ DashboardRange, so với cột DATETIME(3) lưu UTC.
// - Ngày trả về bằng DATE_FORMAT (chuỗi) để Node không đổi kiểu qua múi giờ của máy.
// - Không dùng alias trong WHERE/SUM (MySQL không cho), viết đầy đủ biểu thức.
// Bảng/cột khớp prisma/schema.prisma: orders, order_items, order_status_histories, product_variants, products, product_images, users.

// Cộng 7 giờ (GMT+7) rồi cắt lấy ngày. Hằng số số nguyên, không phải dữ liệu người dùng.
const VN_OFFSET = Prisma.raw(String(Math.trunc(VN_UTC_OFFSET_HOURS)));
const vnDay = (column: Prisma.Sql) =>
  Prisma.sql`DATE_FORMAT(DATE_ADD(${column}, INTERVAL ${VN_OFFSET} HOUR), '%Y-%m-%d')`;

// ĐỊNH NGHĨA DUY NHẤT của "đơn hoàn thành và thời điểm hoàn thành", dùng cho cả doanh thu lẫn top sản phẩm.
// - Thời điểm = lúc đơn chuyển sang COMPLETED (order_status_histories); gom MIN theo đơn để nếu lỡ có nhiều dòng
//   COMPLETED thì doanh thu không bị nhân đôi.
// - Đơn COMPLETED thiếu dòng lịch sử (dữ liệu cũ/seed) dự phòng bằng paidAt rồi updatedAt để không biến mất khỏi báo cáo.
const completedOrders = Prisma.sql`(
  SELECT o.id, o.totalAmount, COALESCE(h.completedAt, o.paidAt, o.updatedAt) AS completedAt
  FROM orders o
  LEFT JOIN (
    SELECT orderId, MIN(createdAt) AS completedAt
    FROM order_status_histories
    WHERE toStatus = ${OrderStatus.COMPLETED}
    GROUP BY orderId
  ) h ON h.orderId = o.id
  WHERE o.status = ${OrderStatus.COMPLETED}
)`;

const COMPLETED_AT = Prisma.sql`c.completedAt`;

const range = (column: Prisma.Sql, bounds: UtcBounds) =>
  Prisma.sql`${column} >= ${toSqlUtc(bounds.gte)} AND ${column} < ${toSqlUtc(bounds.lt)}`;

export interface RevenueDayRow {
  d: string;
  revenue: bigint | number | string;
  completed: bigint | number | string;
}
export interface CountDayRow {
  d: string;
  n: bigint | number | string;
}
export interface TopProductRow {
  id: number;
  name: string;
  imageUrl: string | null;
  quantitySold: bigint | number | string;
  revenue: bigint | number | string;
}
export interface LowStockRow {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  reserved: number;
  minStock: number;
}
export interface TotalRow {
  total: bigint | number | string;
}

// Doanh thu (tổng totalAmount, đã trừ voucher, đã gồm phí ship) và số đơn hoàn thành theo ngày hoàn thành
export function buildRevenueByDayQuery(bounds: UtcBounds) {
  return Prisma.sql`SELECT ${vnDay(COMPLETED_AT)} AS d, COALESCE(SUM(c.totalAmount), 0) AS revenue, COUNT(*) AS completed
    FROM ${completedOrders} c
    WHERE ${range(COMPLETED_AT, bounds)}
    GROUP BY d`;
}

// Số đơn đặt theo ngày đặt, mọi trạng thái
export function buildOrdersByDayQuery(bounds: UtcBounds) {
  return Prisma.sql`SELECT ${vnDay(Prisma.sql`createdAt`)} AS d, COUNT(*) AS n
    FROM orders
    WHERE ${range(Prisma.sql`createdAt`, bounds)}
    GROUP BY d`;
}

// Khách đăng ký mới theo ngày (CUSTOMER, kể cả tài khoản đã khóa)
export function buildNewCustomersByDayQuery(bounds: UtcBounds) {
  return Prisma.sql`SELECT ${vnDay(Prisma.sql`createdAt`)} AS d, COUNT(*) AS n
    FROM users
    WHERE role = 'CUSTOMER' AND ${range(Prisma.sql`createdAt`, bounds)}
    GROUP BY d`;
}

// Top sản phẩm theo số lượng bán (đơn COMPLETED trong kỳ). revenue = price × quantity của dòng hàng,
// TRƯỚC giảm giá voucher và phí ship, nên tổng top không khớp doanh thu. Ảnh: ảnh đầu, dự phòng cột imageUrl cũ.
export function buildTopProductsQuery(bounds: UtcBounds) {
  return Prisma.sql`SELECT p.id AS id, p.name AS name,
      COALESCE(
        (SELECT pi.url FROM product_images pi WHERE pi.productId = p.id ORDER BY pi.sortOrder ASC, pi.id ASC LIMIT 1),
        p.imageUrl
      ) AS imageUrl,
      SUM(oi.quantity) AS quantitySold,
      SUM(oi.price * oi.quantity) AS revenue
    FROM ${completedOrders} c
    JOIN order_items oi ON oi.orderId = c.id
    JOIN product_variants pv ON pv.id = oi.variantId
    JOIN products p ON p.id = pv.productId
    WHERE ${range(COMPLETED_AT, bounds)}
    GROUP BY p.id, p.name, p.imageUrl
    ORDER BY quantitySold DESC, revenue DESC, p.id ASC
    LIMIT ${TOP_PRODUCTS_LIMIT}`;
}

// Biến thể sắp hết: tồn khả dụng (stock - reserved) <= minStock, chỉ biến thể và sản phẩm đang bật.
// Khớp điều kiện low + out của inventory.queries.ts (available <= minStock).
const LOW_STOCK_FROM = Prisma.sql`FROM product_variants pv
  JOIN products p ON p.id = pv.productId
  WHERE pv.isActive = 1 AND p.isActive = 1 AND (pv.stock - pv.reserved) <= pv.minStock`;

export function buildLowStockQuery() {
  return Prisma.sql`SELECT pv.id AS id, pv.productId AS productId, p.name AS productName, pv.sku AS sku,
      pv.size AS size, pv.color AS color, pv.stock AS stock, pv.reserved AS reserved, pv.minStock AS minStock
    ${LOW_STOCK_FROM}
    ORDER BY (pv.stock - pv.reserved) ASC, pv.id ASC
    LIMIT ${LOW_STOCK_LIMIT}`;
}

export function buildLowStockCountQuery() {
  return Prisma.sql`SELECT COUNT(*) AS total ${LOW_STOCK_FROM}`;
}
