// 1) Tạo tài khoản ADMIN đầu tiên từ ADMIN_EMAIL / ADMIN_PASSWORD trong .env.development (hoặc .env.production).
// 2) Tạo danh mục và sản phẩm mẫu (kèm biến thể) cho dev frontend.
// 3) Tạo voucher mẫu (SALE10, GIAM50K, MIN500, MONO10, WELCOME50, HETHAN, HETLUOT, DATAT).
// Chạy lại an toàn: email/slug/SKU đã tồn tại thì bỏ qua, không ghi đè dữ liệu đang có.
// Chạy: npx prisma db seed (production: npm run db:seed:prod)
import { config } from 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';
import { ENV_FILE } from '../src/config/env-file';
import { COLOR_HEX_MAP } from '../src/products/color-hex';

config({ path: ENV_FILE, quiet: true });

// Voucher mẫu cho demo và test (ngày demo 06/12/2026). Chỉ tạo khi `code` chưa có (upsert với update rỗng),
// không bao giờ ghi đè voucher đã tồn tại. Mốc thời gian ghi kèm offset +07:00 để không phụ thuộc múi giờ máy chạy seed.
// Voucher còn hiệu lực có expiresAt sau 31/12/2026.
const VOUCHERS = [
  {
    code: 'SALE10',
    description: 'Giảm 10%, tối đa 50.000đ',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 50_000,
    minOrderValue: 0,
    usageLimit: 1000,
    usedCount: 0,
    startsAt: '2026-11-01T00:00:00+07:00',
    expiresAt: '2027-06-30T23:59:59+07:00',
    isActive: true,
  },
  {
    code: 'GIAM50K',
    description: 'Giảm 50.000đ cho mọi đơn hàng',
    discountType: 'FIXED',
    discountValue: 50_000,
    maxDiscount: null,
    minOrderValue: 0,
    usageLimit: null,
    usedCount: 0,
    startsAt: '2026-11-01T00:00:00+07:00',
    expiresAt: '2027-06-30T23:59:59+07:00',
    isActive: true,
  },
  {
    code: 'MIN500',
    description: 'Giảm 100.000đ cho đơn từ 500.000đ',
    discountType: 'FIXED',
    discountValue: 100_000,
    maxDiscount: null,
    minOrderValue: 500_000,
    usageLimit: 500,
    usedCount: 0,
    startsAt: '2026-11-01T00:00:00+07:00',
    expiresAt: '2027-06-30T23:59:59+07:00',
    isActive: true,
  },
  {
    code: 'MONO10',
    description: 'Giảm 10%, tối đa 100.000₫ cho đơn từ 300.000₫',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
    usageLimit: null,
    usedCount: 0,
    startsAt: '2026-11-01T00:00:00+07:00',
    expiresAt: '2027-06-30T23:59:59+07:00',
    isActive: true,
  },
  {
    code: 'WELCOME50',
    description: 'Giảm 50.000₫ cho đơn từ 400.000₫',
    discountType: 'FIXED',
    discountValue: 50_000,
    maxDiscount: null,
    minOrderValue: 400_000,
    usageLimit: null,
    usedCount: 0,
    startsAt: '2026-11-01T00:00:00+07:00',
    expiresAt: '2027-06-30T23:59:59+07:00',
    isActive: true,
  },
  {
    code: 'HETHAN',
    description: 'Mã đã hết hạn (dùng để thử lỗi)',
    discountType: 'PERCENT',
    discountValue: 20,
    maxDiscount: null,
    minOrderValue: 0,
    usageLimit: null,
    usedCount: 0,
    startsAt: '2026-01-01T00:00:00+07:00',
    expiresAt: '2026-06-30T23:59:59+07:00',
    isActive: true,
  },
  {
    code: 'HETLUOT',
    description: 'Mã đã hết lượt dùng (dùng để thử lỗi)',
    discountType: 'FIXED',
    discountValue: 30_000,
    maxDiscount: null,
    minOrderValue: 0,
    usageLimit: 5,
    usedCount: 5,
    startsAt: '2026-11-01T00:00:00+07:00',
    expiresAt: '2027-06-30T23:59:59+07:00',
    isActive: true,
  },
  {
    code: 'DATAT',
    description: 'Mã đang bị tắt (dùng để thử lỗi)',
    discountType: 'PERCENT',
    discountValue: 15,
    maxDiscount: null,
    minOrderValue: 0,
    usageLimit: null,
    usedCount: 0,
    startsAt: '2026-11-01T00:00:00+07:00',
    expiresAt: '2027-06-30T23:59:59+07:00',
    isActive: false,
  },
] as const;

// Danh mục mẫu: gốc trước, con sau. Chỉ tạo khi slug chưa có.
const CATEGORIES = [
  { name: 'Áo', slug: 'ao', parent: null },
  { name: 'Quần', slug: 'quan', parent: null },
  { name: 'Áo thun', slug: 'ao-thun', parent: 'ao' },
  { name: 'Áo sơ mi', slug: 'ao-so-mi', parent: 'ao' },
  { name: 'Quần jean', slug: 'quan-jean', parent: 'quan' },
  { name: 'Quần short', slug: 'quan-short', parent: 'quan' },
];

// Số ảnh mẫu mỗi sản phẩm (picsum, seed khác nhau: <slug>-1, <slug>-2...)
const SEED_IMAGE_COUNT = 4;

// Sản phẩm mẫu: mỗi sản phẩm sinh biến thể = sizes × colors. Chỉ tạo khi slug chưa có.
// Mỗi tên màu phải có trong COLOR_HEX_MAP (src/products/color-hex.ts) để biến thể có colorHex.
const PRODUCTS = [
  {
    name: 'Áo thun basic cổ tròn',
    slug: 'ao-thun-basic-co-tron',
    category: 'ao-thun',
    price: 199000,
    code: 'ATB',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Trắng', 'Đen'],
  },
  {
    name: 'Áo thun oversize in hình',
    slug: 'ao-thun-oversize-in-hinh',
    category: 'ao-thun',
    price: 259000,
    code: 'ATO',
    sizes: ['M', 'L', 'XL'],
    colors: ['Đen', 'Xám'],
  },
  {
    name: 'Áo thun polo nam',
    slug: 'ao-thun-polo-nam',
    category: 'ao-thun',
    price: 289000,
    code: 'ATP',
    sizes: ['M', 'L', 'XL'],
    colors: ['Xanh navy', 'Trắng'],
  },
  {
    name: 'Áo sơ mi trắng công sở',
    slug: 'ao-so-mi-trang-cong-so',
    category: 'ao-so-mi',
    price: 349000,
    code: 'ASM',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Trắng'],
  },
  {
    name: 'Áo sơ mi kẻ sọc',
    slug: 'ao-so-mi-ke-soc',
    category: 'ao-so-mi',
    price: 379000,
    code: 'ASK',
    sizes: ['M', 'L'],
    colors: ['Xanh', 'Hồng'],
  },
  {
    name: 'Áo sơ mi linen tay ngắn',
    slug: 'ao-so-mi-linen-tay-ngan',
    category: 'ao-so-mi',
    price: 329000,
    code: 'ASL',
    sizes: ['M', 'L', 'XL'],
    colors: ['Be', 'Xanh rêu'],
  },
  {
    name: 'Quần jeans ống đứng',
    slug: 'quan-jeans-ong-dung',
    category: 'quan-jean',
    price: 499000,
    code: 'QJD',
    sizes: ['29', '30', '31', '32'],
    colors: ['Xanh đậm'],
  },
  {
    name: 'Quần jeans rách gối',
    slug: 'quan-jeans-rach-goi',
    category: 'quan-jean',
    price: 549000,
    code: 'QJR',
    sizes: ['29', '30', '31'],
    colors: ['Xanh nhạt', 'Đen'],
  },
  {
    name: 'Quần short kaki',
    slug: 'quan-short-kaki',
    category: 'quan-short',
    price: 249000,
    code: 'QSK',
    sizes: ['M', 'L', 'XL'],
    colors: ['Be', 'Đen'],
  },
  // Sản phẩm đang ẩn: để thử admin lọc isActive và kiểm tra public không hiển thị
  {
    name: 'Quần short thể thao (ngừng bán)',
    slug: 'quan-short-the-thao',
    category: 'quan-short',
    price: 199000,
    code: 'QST',
    sizes: ['M', 'L'],
    colors: ['Đen'],
    isActive: false,
  },
];

const colorCode = (color: string) =>
  color
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase();

const colorHexOf = (color: string) => {
  const hex = COLOR_HEX_MAP[color];
  if (!hex) {
    throw new Error(`Màu "${color}" chưa có trong COLOR_HEX_MAP`);
  }
  return hex;
};

async function seedAdmin(
  prisma: PrismaClient,
  email: string,
  password: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Đã có tài khoản ${email}, bỏ qua.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 10),
      name: 'Administrator',
      role: Role.ADMIN,
    },
  });
  console.log(`Đã tạo tài khoản ADMIN: ${email}`);
}

async function seedCatalog(prisma: PrismaClient) {
  const categoryIds = new Map<string, number>();
  for (const category of CATEGORIES) {
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
      select: { id: true },
    });
    if (existing) {
      categoryIds.set(category.slug, existing.id);
      continue;
    }
    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        parentId: category.parent ? categoryIds.get(category.parent) : null,
      },
      select: { id: true },
    });
    categoryIds.set(category.slug, created.id);
    console.log(`Đã tạo danh mục: ${category.name}`);
  }

  for (const product of PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
      select: { id: true },
    });
    if (existing) continue;

    // Tồn kho gán trực tiếp ở seed (API sản phẩm không nhận stock); cứ 5 biến thể có 1 biến thể hết hàng
    const variants = product.sizes.flatMap((size) =>
      product.colors.map((color) => ({
        sku: `${product.code}-${size}-${colorCode(color)}`,
        size,
        color,
        colorHex: colorHexOf(color),
      })),
    );
    const imageUrls = Array.from(
      { length: SEED_IMAGE_COUNT },
      (_, i) => `https://picsum.photos/seed/${product.slug}-${i + 1}/600/800`,
    );
    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: `${product.name}. Chất liệu thoáng mát, form chuẩn, dễ phối đồ.`,
        price: product.price,
        // imageUrl là cột deprecated, giữ đồng bộ với ảnh đầu như API
        imageUrl: imageUrls[0],
        images: {
          create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
        },
        isActive: product.isActive ?? true,
        categoryId: categoryIds.get(product.category)!,
        variants: {
          create: variants.map((variant, index) => ({
            ...variant,
            stock: index % 5 === 4 ? 0 : 20,
            minStock: 5,
          })),
        },
      },
    });
    console.log(
      `Đã tạo sản phẩm: ${product.name} (${variants.length} biến thể)`,
    );
  }
}

async function seedVouchers(prisma: PrismaClient) {
  for (const voucher of VOUCHERS) {
    const existing = await prisma.voucher.findUnique({
      where: { code: voucher.code },
      select: { id: true },
    });
    // upsert với update rỗng: voucher đã có thì giữ nguyên (không ghi đè, không đặt lại usedCount)
    await prisma.voucher.upsert({
      where: { code: voucher.code },
      update: {},
      create: {
        ...voucher,
        startsAt: new Date(voucher.startsAt),
        expiresAt: new Date(voucher.expiresAt),
      },
    });
    console.log(
      existing
        ? `Đã có voucher ${voucher.code}, bỏ qua.`
        : `Đã tạo voucher: ${voucher.code}`,
    );
  }
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;

  if (!email || !password) {
    throw new Error(`Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong ${ENV_FILE}`);
  }
  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD phải có ít nhất 6 ký tự');
  }
  if (!databaseUrl) {
    throw new Error(`Thiếu DATABASE_URL trong ${ENV_FILE}`);
  }

  // Cùng cấu hình adapter với PrismaService
  const url = new URL(databaseUrl);
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      connectionLimit: 2,
      allowPublicKeyRetrieval: true,
    }),
  });

  try {
    await seedAdmin(prisma, email, password);
    await seedCatalog(prisma);
    await seedVouchers(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
