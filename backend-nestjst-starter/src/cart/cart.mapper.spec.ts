import { toCart } from './cart.mapper';
import type { CartItemRow } from './cart.mapper';

interface RowOptions {
  id?: number;
  quantity?: number;
  stock?: number;
  reserved?: number;
  variantActive?: boolean;
  productActive?: boolean;
  price?: number;
  images?: { url: string }[];
  imageUrl?: string | null;
}

const row = (o: RowOptions = {}): CartItemRow => ({
  id: o.id ?? 1,
  variantId: 10 + (o.id ?? 1),
  quantity: o.quantity ?? 2,
  variant: {
    size: 'M',
    color: 'Đen',
    colorHex: '#000000',
    stock: o.stock ?? 50,
    reserved: o.reserved ?? 0,
    isActive: o.variantActive ?? true,
    product: {
      id: 3,
      name: 'Áo thun',
      slug: 'ao-thun',
      price: o.price ?? 100_000,
      imageUrl: o.imageUrl ?? null,
      isActive: o.productActive ?? true,
      images: o.images ?? [{ url: 'a.jpg' }],
    },
  },
});

describe('toCart', () => {
  it('giỏ rỗng', () => {
    expect(toCart([])).toEqual({
      items: [],
      subtotal: 0,
      itemCount: 0,
      unavailableCount: 0,
    });
  });

  it('dòng bình thường: tính lineTotal, maxQuantity chặn ở 10 và không lộ stock/reserved', () => {
    const cart = toCart([row({ quantity: 3 })]);
    expect(cart.items[0]).toMatchObject({
      quantity: 3,
      unitPrice: 100_000,
      lineTotal: 300_000,
      purchasable: true,
      inStock: true,
      maxQuantity: 10,
      imageUrl: 'a.jpg',
    });
    expect(cart.items[0]).not.toHaveProperty('stock');
    expect(cart.items[0]).not.toHaveProperty('reserved');
    expect(cart).toMatchObject({
      subtotal: 300_000,
      itemCount: 3,
      unavailableCount: 0,
    });
  });

  it('maxQuantity = số còn bán (stock - reserved) khi nhỏ hơn 10', () => {
    const [item] = toCart([row({ stock: 8, reserved: 5 })]).items;
    expect(item.maxQuantity).toBe(3);
  });

  it('hết hàng: vẫn hiện, inStock=false, maxQuantity=0, không tính vào subtotal/itemCount', () => {
    const cart = toCart([row({ stock: 5, reserved: 5 })]);
    expect(cart.items[0]).toMatchObject({
      inStock: false,
      purchasable: true,
      maxQuantity: 0,
      lineTotal: 200_000,
    });
    expect(cart).toMatchObject({
      subtotal: 0,
      itemCount: 0,
      unavailableCount: 1,
    });
  });

  it.each([
    ['biến thể ẩn', { variantActive: false }],
    ['sản phẩm ẩn', { productActive: false }],
  ])('%s: purchasable=false, maxQuantity=0, bị loại khỏi tổng', (_n, o) => {
    const cart = toCart([row({ id: 1, ...o }), row({ id: 2, quantity: 1 })]);
    expect(cart.items[0]).toMatchObject({ purchasable: false, maxQuantity: 0 });
    expect(cart).toMatchObject({
      subtotal: 100_000,
      itemCount: 1,
      unavailableCount: 1,
    });
  });

  it('không tự đổi số lượng khi vượt tồn còn lại', () => {
    const [item] = toCart([row({ quantity: 6, stock: 3 })]).items;
    expect(item.quantity).toBe(6);
    expect(item.maxQuantity).toBe(3);
  });

  it('ảnh: ưu tiên ảnh thật, dự phòng imageUrl cũ, rồi null', () => {
    expect(
      toCart([row({ images: [], imageUrl: 'old.jpg' })]).items[0].imageUrl,
    ).toBe('old.jpg');
    expect(
      toCart([row({ images: [], imageUrl: null })]).items[0].imageUrl,
    ).toBeNull();
  });
});
