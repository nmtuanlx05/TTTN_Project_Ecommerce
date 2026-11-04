import type { Prisma } from '../generated/prisma/client';
import { fold } from '../common/utils/fold';
import { getStockStatus } from '../inventory/inventory.mapper';

// Mỗi `select` dưới đây là danh sách trường được phép trả ra: thêm trường vào đây mới lộ ra API.
// Hàm map là hàm thuần nên unit test được mà không cần database.

// Còn hàng khi tồn khả dụng (stock - reserved) > 0
const isAvailable = (v: { stock: number; reserved: number }) =>
  v.stock - v.reserved > 0;

// Ảnh luôn sắp theo sortOrder (id làm khóa phụ cho ổn định). Ảnh đầu là ảnh đại diện.
// Product.imageUrl là cột DEPRECATED: chỉ dùng dự phòng khi sản phẩm chưa có dòng ProductImage nào.
const imageOrder: Prisma.ProductImageOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { id: 'asc' },
];

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
  images: { select: { url: true }, orderBy: imageOrder, take: 1 },
} as const;

type AdminProductListRow = Prisma.ProductGetPayload<{
  select: typeof adminProductListSelect;
}>;

export function toAdminListItem({
  variants,
  images,
  ...product
}: AdminProductListRow) {
  return {
    ...product,
    imageUrl: images[0]?.url ?? product.imageUrl,
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
      colorHex: true,
      isActive: true,
      stock: true,
      reserved: true,
      minStock: true,
    },
    orderBy: { id: 'asc' },
  },
  // Chỉ dòng ảnh thật (không dự phòng từ imageUrl) để id ảnh luôn là id thật
  images: {
    select: { id: true, url: true, sortOrder: true },
    orderBy: imageOrder,
  },
} as const;

type AdminProductDetailRow = Prisma.ProductGetPayload<{
  select: typeof adminProductDetailSelect;
}>;

// imageUrl (tương thích) = ảnh đầu; chưa có dòng ảnh nào thì giữ giá trị cột cũ
export function toAdminDetail(product: AdminProductDetailRow) {
  return {
    ...product,
    imageUrl: product.images[0]?.url ?? product.imageUrl,
  };
}

// ===== Public: danh sách =====

export const publicProductListSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  imageUrl: true,
  category: { select: { id: true, name: true, slug: true } },
  // Chỉ biến thể đang bán, và chỉ lấy số liệu tồn để tính inStock/lowStock (không trả ra ngoài)
  // Một truy vấn Prisma lấy luôn 2 ảnh đầu và biến thể (không gọi thêm cho từng sản phẩm)
  images: { select: { url: true }, orderBy: imageOrder, take: 2 },
  variants: {
    where: { isActive: true },
    select: {
      color: true,
      colorHex: true,
      stock: true,
      reserved: true,
      minStock: true,
    },
    orderBy: { id: 'asc' },
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

// Các màu khác nhau của biến thể (bỏ trùng theo fold), theo thứ tự xuất hiện.
// Cùng màu mà biến thể đầu chưa có hex thì lấy hex của biến thể sau.
export function buildColors(
  variants: { color: string; colorHex: string | null }[],
) {
  const colors = new Map<string, { name: string; hex: string | null }>();
  for (const { color, colorHex } of variants) {
    const key = fold(color.trim());
    const found = colors.get(key);
    if (!found) {
      colors.set(key, { name: color, hex: colorHex });
    } else if (found.hex === null && colorHex !== null) {
      found.hex = colorHex;
    }
  }
  return [...colors.values()];
}

// Dựng object tường minh (không spread) để không lộ thêm trường khi select đổi
export function toPublicListItem(product: PublicProductListRow) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    imageUrl: product.images[0]?.url ?? product.imageUrl,
    secondImageUrl: product.images[1]?.url ?? null,
    colors: buildColors(product.variants),
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
      colorHex: true,
      stock: true,
      reserved: true,
    },
    orderBy: { id: 'asc' },
  },
  images: { select: { url: true }, orderBy: imageOrder },
} as const;

type PublicProductDetailRow = Prisma.ProductGetPayload<{
  select: typeof publicProductDetailSelect;
}>;

// Không trả stock/reserved: khách chỉ cần biết còn hay hết
export function toPublicDetail({
  variants,
  images,
  ...product
}: PublicProductDetailRow) {
  // Chưa có dòng ảnh nào thì dự phòng bằng cột cũ imageUrl (nếu có giá trị)
  const urls = images.length
    ? images.map((image) => ({ url: image.url }))
    : product.imageUrl
      ? [{ url: product.imageUrl }]
      : [];
  return {
    ...product,
    imageUrl: urls[0]?.url ?? null,
    images: urls,
    inStock: variants.some(isAvailable),
    variants: variants.map(({ stock, reserved, ...variant }) => ({
      ...variant,
      inStock: isAvailable({ stock, reserved }),
    })),
  };
}
