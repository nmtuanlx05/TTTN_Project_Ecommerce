import type { PrismaClient } from '../../../src/generated/prisma/client';
import { assertSafeTestDatabaseUrl } from '../../../scripts/assert-test-db';
import { assertConnectedToTestDatabase } from './prisma-client';

const SAFE_TABLE_NAME = /^[A-Za-z0-9_]+$/;

// Xóa SẠCH dữ liệu mọi bảng nghiệp vụ (giữ nguyên cấu trúc và bảng _prisma_migrations), reset AUTO_INCREMENT.
//
// Hai lớp chốt chặn chạy TRƯỚC khi xóa bất cứ thứ gì:
//   1) assertSafeTestDatabaseUrl: URL phải trỏ máy cục bộ, không cổng 3306/3307, tên DB kết thúc bằng _test;
//   2) assertConnectedToTestDatabase: hỏi chính MySQL `SELECT DATABASE()` và so với tên trong URL.
//
// Vì sao dùng MỘT transaction: SET FOREIGN_KEY_CHECKS là biến của TỪNG KẾT NỐI, mà PrismaClient có nhiều kết nối.
// Transaction giữ đúng một kết nối cho cả chuỗi lệnh. Khối finally luôn bật lại cờ để không "rò" sang kết nối khác.
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
  await assertConnectedToTestDatabase(prisma);

  const rows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'`;
  const tables = rows.map((row) => row.name);
  const unsafe = tables.filter((name) => !SAFE_TABLE_NAME.test(name));
  if (unsafe.length > 0) {
    throw new Error(`Tên bảng lạ, dừng dọn DB: ${unsafe.join(', ')}`);
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
      try {
        for (const table of tables) {
          await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
        }
      } finally {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
      }
    },
    { timeout: 30_000 },
  );
}
