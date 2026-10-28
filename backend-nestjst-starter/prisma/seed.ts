// 1) Tạo tài khoản ADMIN đầu tiên từ ADMIN_EMAIL / ADMIN_PASSWORD trong .env.development (hoặc .env.production).
// 2) Tạo danh mục và sản phẩm mẫu (kèm biến thể) cho dev frontend.
// Chạy lại an toàn: email/slug/SKU đã tồn tại thì bỏ qua, không ghi đè dữ liệu đang có.
// Chạy: npx prisma db seed (production: npm run db:seed:prod)
import { config } from 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';
import { ENV_FILE } from '../src/config/env-file';

config({ path: ENV_FILE, quiet: true });

// Danh mục mẫu: gốc trước, con sau. Chỉ tạo khi slug chưa có.
const CATEGORIES = [
  { name: 'Áo', slug: 'ao', parent: null },
  { name: 'Quần', slug: 'quan', parent: null },
  { name: 'Áo thun', slug: 'ao-thun', parent: 'ao' },
  { name: 'Áo sơ mi', slug: 'ao-so-mi', parent: 'ao' },
  { name: 'Quần jean', slug: 'quan-jean', parent: 'quan' },
  { name: 'Quần short', slug: 'quan-short', parent: 'quan' },
];

// Sản phẩm mẫu: mỗi sản phẩm sinh biến thể = sizes × colors. Chỉ tạo khi slug chưa có.
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
      })),
    );
    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: `${product.name}. Chất liệu thoáng mát, form chuẩn, dễ phối đồ.`,
        price: product.price,
        imageUrl: `https://picsum.photos/seed/${product.slug}/600/800`,
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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
