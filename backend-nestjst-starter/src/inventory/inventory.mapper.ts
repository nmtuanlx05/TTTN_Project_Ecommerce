import type { Prisma } from '../generated/prisma/client';
import type { StockStatus } from './inventory.constants';

// Mỗi `select` dưới đây là danh sách trường được phép trả ra: thêm trường vào đây mới lộ ra API.

export interface StockLevel {
  stock: number;
  reserved: number;
  minStock: number;
}

// Tồn khả dụng luôn là stock - reserved, không bao giờ dùng riêng stock
export const getAvailable = ({
  stock,
  reserved,
}: Pick<StockLevel, 'stock' | 'reserved'>) => stock - reserved;

// Phải khớp với STOCK_CONDITION trong inventory.queries.ts (bản SQL của cùng quy tắc)
export function getStockStatus(level: StockLevel): StockStatus {
  const available = getAvailable(level);
  if (available <= 0) return 'out';
  if (available <= level.minStock) return 'low';
  return 'in_stock';
}

// Thoát ký tự đặc biệt của LIKE bằng '!' (dùng cùng ESCAPE '!' trong SQL)
export const escapeLike = (text: string) => text.replace(/[!%_]/g, '!$&');

export const inventoryVariantSelect = {
  id: true,
  sku: true,
  size: true,
  color: true,
  stock: true,
  reserved: true,
  minStock: true,
  isActive: true,
  product: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      isActive: true,
      category: { select: { id: true, name: true } },
    },
  },
} as const;

type InventoryVariantRow = Prisma.ProductVariantGetPayload<{
  select: typeof inventoryVariantSelect;
}>;

export function toInventoryItem(row: InventoryVariantRow) {
  return {
    ...row,
    available: getAvailable(row),
    stockStatus: getStockStatus(row),
    // Đã ẩn nếu biến thể hoặc sản phẩm của nó không còn bán
    isHidden: !row.isActive || !row.product.isActive,
  };
}

// Chỉ trả id và tên người thực hiện, không lộ email hay mật khẩu
export const stockMovementSelect = {
  id: true,
  type: true,
  quantity: true,
  stockBefore: true,
  stockAfter: true,
  reason: true,
  note: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const;
