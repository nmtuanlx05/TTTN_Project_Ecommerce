// Script DEV: bổ sung ảnh picsum cho sản phẩm có ít hơn 3 ảnh (để dev frontend thử gallery/hover).
// Chạy lại an toàn: chỉ INSERT vào product_images, không sửa/xóa dữ liệu nào; sản phẩm đã đủ ảnh thì bỏ qua.
// KHÔNG chạy ở production. Chạy: npm run db:dev:fill-images
import { config } from 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { ENV_FILE } from '../src/config/env-file';

config({ path: ENV_FILE, quiet: true });

const TARGET_IMAGE_COUNT = 3;
const MAX_IMAGES = 6;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Script này chỉ dùng cho môi trường dev');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(`Thiếu DATABASE_URL trong ${ENV_FILE}`);
  }

  // Cùng cấu hình adapter với seed.ts
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
    const products = await prisma.product.findMany({
      select: {
        id: true,
        slug: true,
        images: { select: { sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { id: 'asc' },
    });

    let touched = 0;
    for (const product of products) {
      const existing = product.images.length;
      const missing = Math.min(TARGET_IMAGE_COUNT, MAX_IMAGES) - existing;
      if (missing <= 0) continue;

      // Nối tiếp sau sortOrder lớn nhất hiện có để giữ nguyên thứ tự ảnh cũ
      const start =
        existing > 0 ? product.images[existing - 1].sortOrder + 1 : 0;
      await prisma.productImage.createMany({
        data: Array.from({ length: missing }, (_, i) => ({
          productId: product.id,
          sortOrder: start + i,
          url: `https://picsum.photos/seed/${product.slug}-${existing + i + 1}/600/800`,
        })),
      });
      touched++;
      console.log(`+${missing} ảnh cho ${product.slug} (đã có ${existing})`);
    }
    console.log(
      `Xong: bổ sung ảnh cho ${touched}/${products.length} sản phẩm (sản phẩm đủ ảnh được bỏ qua).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
