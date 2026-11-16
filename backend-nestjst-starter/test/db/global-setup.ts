import { assertSafeTestDatabaseUrl } from '../../scripts/assert-test-db';
import {
  assertConnectedToTestDatabase,
  createTestPrisma,
} from './helpers/prisma-client';

// Chạy MỘT LẦN trước mọi file test của `npm run test:db`:
//  1) chốt chặn URL (ném lỗi => Jest dừng, không file test nào chạy);
//  2) nối thử và xác nhận đúng DB test, nếu không nối được thì báo cách khắc phục.
export default async function globalSetup(): Promise<void> {
  const { host, port, database } = assertSafeTestDatabaseUrl(
    process.env.DATABASE_URL,
  );

  const prisma = createTestPrisma();
  try {
    await assertConnectedToTestDatabase(prisma);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('Từ chối chạy')) throw error;
    throw new Error(
      `Không kết nối được DB test ${host}:${port}/${database}. ` +
        'Đã chạy `npm run db:test:up` và `npm run db:test:migrate` chưa? ' +
        `Chi tiết: ${message.split('\n')[0]}`,
      { cause: error },
    );
  } finally {
    await prisma.$disconnect();
  }
}
