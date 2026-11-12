import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { assertSafeTestDatabaseUrl } from '../../../scripts/assert-test-db';

// Mọi truy cập DB trong bộ test:db đều đi qua đây để luôn qua chốt chặn an toàn.
export function getTestDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  assertSafeTestDatabaseUrl(url);
  return url as string;
}

// PrismaClient THẬT (không mock) nối vào DB test, dùng adapter MariaDB như PrismaService.
export function createTestPrisma(): PrismaClient {
  const url = new URL(getTestDatabaseUrl());
  const adapter = new PrismaMariaDb({
    host: url.hostname.replace(/^\[|\]$/g, ''),
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 5,
    // MySQL 8 dùng caching_sha2_password: thiếu cờ này driver có thể treo khi lấy khóa RSA (chỉ dùng cho DB tạm cục bộ)
    allowPublicKeyRetrieval: true,
  });
  return new PrismaClient({ adapter, log: ['warn', 'error'] });
}

// Lớp phòng thủ thứ hai: hỏi chính MySQL xem đang ở DB nào, phải trùng tên trong URL và kết thúc bằng _test.
export async function assertConnectedToTestDatabase(
  prisma: PrismaClient,
): Promise<string> {
  const expected = assertSafeTestDatabaseUrl(process.env.DATABASE_URL).database;
  const [row] = await prisma.$queryRaw<{ db: string | null }[]>`
    SELECT DATABASE() AS db
  `;
  const actual = row?.db ?? null;
  if (actual !== expected || !actual.endsWith('_test')) {
    throw new Error(
      `Từ chối chạy: kết nối đang ở DB "${actual}", khác DB test mong đợi "${expected}".`,
    );
  }
  return actual;
}
