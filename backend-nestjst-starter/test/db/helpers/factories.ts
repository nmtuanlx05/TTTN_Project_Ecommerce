import type { PrismaClient } from '../../../src/generated/prisma/client';
import { DiscountType, Role } from '../../../src/generated/prisma/enums';

// Dựng dữ liệu bằng PrismaClient THẬT. Mỗi bản ghi có hậu tố ngẫu nhiên (email, slug, sku, code là UNIQUE)
// nên các lần gọi không đụng nhau.
let sequence = 0;
export function uniq(): string {
  sequence += 1;
  return `${Date.now().toString(36)}${sequence.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function createCategory(prisma: PrismaClient) {
  const key = uniq();
  return prisma.category.create({
    data: { name: `Danh mục ${key}`, slug: `cat-${key}` },
  });
}

export async function createProduct(
  prisma: PrismaClient,
  overrides: { price?: number; isActive?: boolean; categoryId?: number } = {},
) {
  const key = uniq();
  const categoryId = overrides.categoryId ?? (await createCategory(prisma)).id;
  return prisma.product.create({
    data: {
      name: `Sản phẩm ${key}`,
      slug: `prod-${key}`,
      price: overrides.price ?? 200_000,
      isActive: overrides.isActive ?? true,
      categoryId,
    },
  });
}

export async function createVariant(
  prisma: PrismaClient,
  productId: number,
  overrides: {
    stock?: number;
    reserved?: number;
    size?: string;
    color?: string;
    colorHex?: string | null;
    sku?: string;
    isActive?: boolean;
  } = {},
) {
  const key = uniq();
  return prisma.productVariant.create({
    data: {
      productId,
      sku: overrides.sku ?? `SKU-${key}`,
      size: overrides.size ?? 'M',
      color: overrides.color ?? `Màu ${key}`,
      colorHex: overrides.colorHex ?? null,
      stock: overrides.stock ?? 10,
      reserved: overrides.reserved ?? 0,
      isActive: overrides.isActive ?? true,
    },
  });
}

// Một sản phẩm + một biến thể (trường hợp phổ biến nhất)
export async function createSellableVariant(
  prisma: PrismaClient,
  options: { price?: number; stock?: number; reserved?: number } = {},
) {
  const product = await createProduct(prisma, { price: options.price });
  const variant = await createVariant(prisma, product.id, {
    stock: options.stock,
    reserved: options.reserved,
  });
  return { product, variant };
}

export async function createUser(
  prisma: PrismaClient,
  overrides: { role?: Role; isActive?: boolean } = {},
) {
  const key = uniq();
  return prisma.user.create({
    data: {
      email: `user-${key}@test.local`,
      // Không phải hash thật: test không đăng nhập bằng mật khẩu, chỉ dùng JWT ký sẵn
      password: 'not-a-real-hash',
      name: `Khách ${key}`,
      role: overrides.role ?? Role.CUSTOMER,
      isActive: overrides.isActive ?? true,
    },
  });
}

// Giỏ hàng cho user; các dòng được tạo THEO ĐÚNG THỨ TỰ truyền vào (cần cho test thứ tự dòng giỏ)
export async function createCart(
  prisma: PrismaClient,
  userId: number,
  items: { variantId: number; quantity: number }[],
) {
  const cart = await prisma.cart.create({ data: { userId } });
  for (const item of items) {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: item.variantId,
        quantity: item.quantity,
      },
    });
  }
  return cart;
}

// Người mua: một CUSTOMER kèm giỏ hàng đã có sẵn các dòng
export async function createBuyer(
  prisma: PrismaClient,
  items: { variantId: number; quantity: number }[],
) {
  const user = await createUser(prisma);
  await createCart(prisma, user.id, items);
  return user;
}

export async function createVoucher(
  prisma: PrismaClient,
  overrides: {
    code?: string;
    discountType?: DiscountType;
    discountValue?: number;
    maxDiscount?: number | null;
    minOrderValue?: number;
    usageLimit?: number | null;
    usedCount?: number;
    isActive?: boolean;
    startsAt?: Date;
    expiresAt?: Date;
  } = {},
) {
  const day = 24 * 60 * 60 * 1000;
  return prisma.voucher.create({
    data: {
      code: overrides.code ?? `VC${uniq().toUpperCase()}`,
      discountType: overrides.discountType ?? DiscountType.FIXED,
      discountValue: overrides.discountValue ?? 10_000,
      maxDiscount: overrides.maxDiscount ?? null,
      minOrderValue: overrides.minOrderValue ?? 0,
      usageLimit: overrides.usageLimit ?? null,
      usedCount: overrides.usedCount ?? 0,
      isActive: overrides.isActive ?? true,
      // Đang hiệu lực: bắt đầu từ hôm qua, hết hạn ngày mai
      startsAt: overrides.startsAt ?? new Date(Date.now() - day),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + day),
    },
  });
}
