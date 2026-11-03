import type { Prisma } from '../generated/prisma/client';
import { getStockStatus } from '../inventory/inventory.mapper';

// Mỗi `select` dưới đây là danh sách trường được phép trả ra: thêm trường vào đây mới lộ ra API.
// Hàm map là hàm thuần nên unit test được mà không cần database.

// Còn hàng khi tồn khả dụng (stock - reserved) > 0
const isAvailable = (v: { stock: number; reserved: number }) =>
  v.stock - v.reserved > 0;

// ===== Admin: danh sách =====

export const adminProductListSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  // Chỉ lấy cờ isActive để đếm số biến thể trong cùng một truy vấn (không N+1)
  variants: { select: { isActive: true } },
} as const;

type AdminProductListRow = Prisma.ProductGetPayload<{
  select: typeof adminProductListSelect;
}>;

export function toAdminListItem({ variants, ...product }: AdminProductListRow) {
  return {
    ...product,
    variantCount: variants.length,
    activeVariantCount: variants.filter((v) => v.isActive).length,
  };
}

// ===== Admin: chi tiết (tồn kho chỉ đọc, do module Kho quản lý) =====

export const adminProductDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      isActive: true,
      stock: true,
      reserved: true,
      minStock: true,
    },
    orderBy: { id: 'asc' },
  },
} as const;

// ===== Public: danh sách =====

export const publicProductListSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  imageUrl: true,
  category: { select: { id: true, name: true, slug: true } },
  // Chỉ biến thể đang bán, và chỉ lấy số liệu tồn để tính inStock/lowStock (không trả ra ngoài)
  variants: {
    where: { isActive: true },
    select: { stock: true, reserved: true, minStock: true },
  },
} as const;

type PublicProductListRow = Prisma.ProductGetPayload<{
  select: typeof publicProductListSelect;
}>;

// Sắp hết: có ít nhất một biến thể còn hàng và mọi biến thể còn hàng đều ở trạng thái 'low'
// của module Kho (biến thể đã hết hàng không tính). minStock = 0 thì không bao giờ 'low'.
const isLowStock = (variants: PublicProductListRow['variants']) => {
  const inStockStatuses = variants
    .map(getStockStatus)
    .filter((status) => status !== 'out');
  return (
    inStockStatuses.length > 0 && inStockStatuses.every((s) => s === 'low')
  );
};

// Dựng object tường minh (không spread) để không lộ thêm trường khi select đổi
export function toPublicListItem(product: PublicProductListRow) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    imageUrl: product.imageUrl,
    category: product.category,
    inStock: product.variants.some(isAvailable),
    lowStock: isLowStock(product.variants),
  };
}

// ===== Public: chi tiết =====

export const publicProductDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  imageUrl: true,
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      stock: true,
      reserved: true,
    },
    orderBy: { id: 'asc' },
  },
} as const;

type PublicProductDetailRow = Prisma.ProductGetPayload<{
  select: typeof publicProductDetailSelect;
}>;

// Không trả stock/reserved: khách chỉ cần biết còn hay hết
export function toPublicDetail({
  variants,
  ...product
}: PublicProductDetailRow) {
  return {
    ...product,
    inStock: variants.some(isAvailable),
    variants: variants.map(({ stock, reserved, ...variant }) => ({
      ...variant,
      inStock: isAvailable({ stock, reserved }),
    })),
  };
}
