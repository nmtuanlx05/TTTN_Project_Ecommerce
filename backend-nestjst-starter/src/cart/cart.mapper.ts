import type { Prisma } from '../generated/prisma/client';
import { getAvailable } from '../inventory/inventory.mapper';
import { imageOrder } from '../products/products.mapper';
import { MAX_QUANTITY_PER_ITEM } from './cart.constants';

// `select` dưới đây là danh sách trường được phép đọc; stock/reserved chỉ để tính cờ, không bao giờ trả ra.
// Một truy vấn lồng (dòng → biến thể → sản phẩm → ảnh đầu) nên không N+1.
export const cartItemSelect = {
  id: true,
  variantId: true,
  quantity: true,
  variant: {
    select: {
      size: true,
      color: true,
      colorHex: true,
      stock: true,
      reserved: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          imageUrl: true,
          isActive: true,
          images: { select: { url: true }, orderBy: imageOrder, take: 1 },
        },
      },
    },
  },
} as const;

export type CartItemRow = Prisma.CartItemGetPayload<{
  select: typeof cartItemSelect;
}>;

// Biến thể và sản phẩm đều đang bán (không xét tồn kho)
export const isPurchasable = (row: {
  isActive: boolean;
  product: { isActive: boolean };
}) => row.isActive && row.product.isActive;

export function toCartItem(row: CartItemRow) {
  const { variant } = row;
  const { product } = variant;
  const purchasable = isPurchasable(variant);
  const available = getAvailable(variant);

  return {
    id: row.id,
    variantId: row.variantId,
    quantity: row.quantity,
    productId: product.id,
    name: product.name,
    slug: product.slug,
    // Ảnh thật trước, cột imageUrl (deprecated) chỉ là dự phòng
    imageUrl: product.images[0]?.url ?? product.imageUrl,
    size: variant.size,
    color: variant.color,
    colorHex: variant.colorHex,
    unitPrice: product.price,
    lineTotal: product.price * row.quantity,
    purchasable,
    inStock: available > 0,
    // Chỉ cho ô chọn số lượng; chặn trên ở 10 nên không lộ tồn kho thực khi còn nhiều
    maxQuantity: purchasable
      ? Math.max(0, Math.min(MAX_QUANTITY_PER_ITEM, available))
      : 0,
  };
}

export type CartItemView = ReturnType<typeof toCartItem>;

// subtotal, itemCount chỉ tính dòng mua được; unavailableCount là số dòng còn lại (để giao diện cảnh báo)
export function toCart(rows: CartItemRow[]) {
  const items = rows.map(toCartItem);
  const buyable = items.filter((item) => item.purchasable && item.inStock);
  return {
    items,
    subtotal: buyable.reduce((sum, item) => sum + item.lineTotal, 0),
    itemCount: buyable.reduce((sum, item) => sum + item.quantity, 0),
    unavailableCount: items.length - buyable.length,
  };
}
