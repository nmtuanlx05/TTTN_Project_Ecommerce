import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { InventorySortField, StockStatus } from './inventory.constants';

// SQL thô cho danh sách/summary vì Prisma không viết được điều kiện stock - reserved.
// Quy tắc an toàn:
// - Mọi giá trị từ người dùng đi qua ${} của Prisma.sql, tức là tham số ràng buộc (?).
// - sortBy/order chỉ chọn từ bảng đoạn SQL viết sẵn bên dưới, không nối chuỗi.
// - Không dùng alias `available` trong WHERE/SUM (MySQL không cho), luôn viết đầy đủ biểu thức.
// Bảng/cột: product_variants (id, productId, sku, stock, reserved, minStock, isActive),
// products (id, name, categoryId, isActive) — khớp prisma/schema.prisma.

export interface InventoryFilter {
  // Danh mục + toàn bộ danh mục con; không được rỗng (service xử lý ca rỗng trước khi gọi)
  categoryIds?: number[];
  includeHidden: boolean;
  // Từ khóa đã thoát ký tự LIKE, chưa bọc %
  likeText?: string;
  stockStatus?: StockStatus;
}

const AVAILABLE = Prisma.sql`(pv.stock - pv.reserved)`;

// Điều kiện của từng trạng thái; khớp getStockStatus trong inventory.mapper.ts
export const STOCK_CONDITION: Record<StockStatus, Prisma.Sql> = {
  out: Prisma.sql`${AVAILABLE} <= 0`,
  low: Prisma.sql`${AVAILABLE} > 0 AND ${AVAILABLE} <= pv.minStock`,
  in_stock: Prisma.sql`${AVAILABLE} > 0 AND ${AVAILABLE} > pv.minStock`,
};

// name: tên sản phẩm, rồi id sản phẩm để các biến thể của cùng một sản phẩm đứng liền nhau,
// rồi id biến thể. Kiểu khác dùng id biến thể làm khóa phụ để phân trang ổn định.
export const ORDER_SQL: Record<
  InventorySortField,
  Record<'asc' | 'desc', Prisma.Sql>
> = {
  name: {
    asc: Prisma.sql`p.name ASC, p.id ASC, pv.id ASC`,
    desc: Prisma.sql`p.name DESC, p.id DESC, pv.id ASC`,
  },
  stock: {
    asc: Prisma.sql`pv.stock ASC, pv.id ASC`,
    desc: Prisma.sql`pv.stock DESC, pv.id ASC`,
  },
  available: {
    asc: Prisma.sql`${AVAILABLE} ASC, pv.id ASC`,
    desc: Prisma.sql`${AVAILABLE} DESC, pv.id ASC`,
  },
};

function buildFrom(filter: InventoryFilter) {
  const conditions: Prisma.Sql[] = [];

  if (!filter.includeHidden) {
    conditions.push(Prisma.sql`pv.isActive = 1 AND p.isActive = 1`);
  }
  if (filter.categoryIds) {
    if (filter.categoryIds.length === 0) {
      // Prisma.join([]) ném lỗi; ca danh mục không tồn tại phải được xử lý ở service
      throw new Error('categoryIds không được rỗng');
    }
    conditions.push(
      Prisma.sql`p.categoryId IN (${Prisma.join(filter.categoryIds)})`,
    );
  }
  if (filter.likeText) {
    const pattern = `%${filter.likeText}%`;
    conditions.push(
      Prisma.sql`(p.name LIKE ${pattern} ESCAPE '!' OR pv.sku LIKE ${pattern} ESCAPE '!')`,
    );
  }
  if (filter.stockStatus) {
    conditions.push(
      Prisma.sql`(${pickByKey(STOCK_CONDITION, filter.stockStatus, 'stockStatus')})`,
    );
  }

  const where = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
  return Prisma.sql`FROM product_variants pv JOIN products p ON p.id = pv.productId ${where}`;
}

// Chỉ nhận khóa có thật trong bảng (chặn cả 'constructor', '__proto__'...)
function pickByKey<T>(table: Record<string, T>, key: string, label: string): T {
  if (!Object.hasOwn(table, key)) {
    throw new BadRequestException(`Giá trị ${label} không hợp lệ`);
  }
  return table[key];
}

export function buildListIdsQuery(
  filter: InventoryFilter,
  sortBy: InventorySortField,
  order: 'asc' | 'desc',
  limit: number,
  offset: number,
) {
  const byField = pickByKey(ORDER_SQL, sortBy, 'sortBy');
  const orderBy = pickByKey(byField, order, 'order');
  return Prisma.sql`SELECT pv.id ${buildFrom(filter)} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
}

export function buildCountQuery(filter: InventoryFilter) {
  return Prisma.sql`SELECT COUNT(*) AS total ${buildFrom(filter)}`;
}

// Summary không có lọc theo q/stockStatus: mỗi trạng thái là một cột riêng
export function buildSummaryQuery(
  filter: Pick<InventoryFilter, 'categoryIds' | 'includeHidden'>,
) {
  const count = (status: StockStatus) =>
    Prisma.sql`COALESCE(SUM(CASE WHEN ${STOCK_CONDITION[status]} THEN 1 ELSE 0 END), 0)`;
  return Prisma.sql`SELECT COUNT(*) AS total, ${count('in_stock')} AS inStock, ${count('low')} AS low, ${count('out')} AS \`out\` ${buildFrom(filter)}`;
}
