import { spawnSync, SpawnSyncReturns } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PrismaClient } from '../../src/generated/prisma/client';
import {
  assertConnectedToTestDatabase,
  createTestPrisma,
  getTestDatabaseUrl,
} from './helpers/prisma-client';

// Chứng minh toàn bộ migration chạy được từ DB TRỐNG bằng `prisma migrate deploy` (lệnh `npm run db:test:migrate`
// phải chạy TRƯỚC file này) và kết quả đúng như schema + các ràng buộc CHECK viết tay.

const PROJECT_ROOT = resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'prisma', 'migrations');
const SCHEMA_FILE = join(PROJECT_ROOT, 'prisma', 'schema.prisma');
const PRISMA_BIN = join(PROJECT_ROOT, 'node_modules', '.bin', 'prisma');

// Danh sách CHECK mong đợi (Prisma không khai báo được trong schema nên không suy ra tự động được).
// Thêm/bớt CHECK bằng migration mới thì test này phải được cập nhật CÓ CHỦ ĐÍCH.
const EXPECTED_CHECKS = [
  // init_ecommerce (16)
  'chk_cart_items_quantity',
  'chk_order_items_price',
  'chk_order_items_quantity',
  'chk_orders_discount_amount',
  'chk_orders_total_amount',
  'chk_product_variants_reserved',
  'chk_product_variants_stock',
  'chk_products_price',
  'chk_vouchers_dates',
  'chk_vouchers_discount_value',
  'chk_vouchers_max_discount_positive',
  'chk_vouchers_min_order_value',
  'chk_vouchers_percent_max',
  'chk_vouchers_usage_limit',
  'chk_vouchers_usage_limit_positive',
  'chk_vouchers_used_count',
  // add_product_images_color_hex (2)
  'chk_product_images_sort_order',
  'chk_product_variants_color_hex',
  // add_order_checkout (1)
  'chk_payment_transactions_amount',
  // add_payment_review (1)
  'chk_payment_transactions_success_order',
].sort();

function runPrisma(args: string[]): SpawnSyncReturns<string> {
  // getTestDatabaseUrl() chạy lại chốt chặn trước khi giao DATABASE_URL cho lệnh con
  getTestDatabaseUrl();
  return spawnSync(PRISMA_BIN, args, {
    cwd: PROJECT_ROOT,
    // NODE_ENV=test để prisma.config.ts tìm .env.test (không tồn tại) thay vì .env.development
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
    timeout: 50_000,
  });
}

function describeFailure(label: string, r: SpawnSyncReturns<string>): string {
  return `${label} thất bại (mã thoát ${r.status}, signal ${r.signal})\n${r.stdout}\n${r.stderr}`;
}

describe('Migration trên DB trống (MySQL thật)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await assertConnectedToTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('máy chủ MySQL 8.0 với charset/collation giống docker-compose.yml', async () => {
    const [row] = await prisma.$queryRaw<
      { version: string; charset: string; collation: string }[]
    >`SELECT @@version AS version, @@character_set_server AS charset, @@collation_server AS collation`;
    expect(row.version.startsWith('8.0.')).toBe(true);
    expect(row.charset).toBe('utf8mb4');
    expect(row.collation).toBe('utf8mb4_unicode_ci');
  });

  it('mọi migration trong thư mục đều đã áp, hoàn tất, không bị rollback', async () => {
    const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(dirs.length).toBeGreaterThan(0);

    const rows = await prisma.$queryRaw<
      {
        name: string;
        finishedAt: Date | null;
        rolledBackAt: Date | null;
      }[]
    >`SELECT migration_name AS name, finished_at AS finishedAt, rolled_back_at AS rolledBackAt
      FROM _prisma_migrations ORDER BY migration_name`;

    expect(rows.map((r) => r.name)).toEqual(dirs);
    expect(rows.every((r) => r.finishedAt !== null)).toBe(true);
    expect(rows.every((r) => r.rolledBackAt === null)).toBe(true);
  });

  it('có đúng các bảng của schema.prisma (mỗi model một bảng @@map) và _prisma_migrations', async () => {
    const schema = readFileSync(SCHEMA_FILE, 'utf8');
    const mapped = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(mapped.length).toBeGreaterThan(0);

    const rows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`;
    const actual = rows.map((r) => r.name);

    expect(actual).toEqual([...mapped, '_prisma_migrations'].sort());
    // Số bảng = số model + 1 (bảng nhật ký migration của Prisma)
    expect(actual).toHaveLength(mapped.length + 1);
  });

  it('mọi bảng nghiệp vụ dùng utf8mb4_unicode_ci', async () => {
    const rows = await prisma.$queryRaw<{ name: string; collation: string }[]>`
      SELECT TABLE_NAME AS name, TABLE_COLLATION AS collation FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'`;
    const wrong = rows.filter((r) => r.collation !== 'utf8mb4_unicode_ci');
    expect(wrong).toEqual([]);
  });

  it('có đúng các ràng buộc CHECK viết tay và tất cả đang được ép buộc (ENFORCED)', async () => {
    const rows = await prisma.$queryRaw<{ name: string; enforced: string }[]>`
      SELECT CONSTRAINT_NAME AS name, ENFORCED AS enforced FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'CHECK'
      ORDER BY CONSTRAINT_NAME`;

    expect(rows.map((r) => r.name)).toEqual(EXPECTED_CHECKS);
    expect(rows).toHaveLength(20);
    expect(rows.filter((r) => r.enforced !== 'YES')).toEqual([]);
  });

  it('chạy lại `migrate deploy` lần hai: thành công và không áp thêm gì', async () => {
    const countBefore = await countMigrations(prisma);
    const result = runPrisma(['migrate', 'deploy']);
    if (result.status !== 0)
      throw new Error(describeFailure('migrate deploy (lần 2)', result));
    expect(await countMigrations(prisma)).toBe(countBefore);
  });

  it('`migrate status` báo DB khớp với thư mục migration', () => {
    const result = runPrisma(['migrate', 'status']);
    if (result.status !== 0)
      throw new Error(describeFailure('migrate status', result));
  });

  // Dùng --exit-code: 0 = không lệch, 2 = có lệch, 1 = lỗi. Không cần shadow database.
  it('không có drift giữa DB sau khi áp migration và schema.prisma', () => {
    const result = runPrisma([
      'migrate',
      'diff',
      '--from-config-datasource',
      '--to-schema',
      'prisma/schema.prisma',
      '--exit-code',
    ]);
    if (result.status !== 0)
      throw new Error(
        describeFailure(
          result.status === 2
            ? 'migrate diff (CÓ LỆCH giữa migration và schema.prisma)'
            : 'migrate diff',
          result,
        ),
      );
  });
});

async function countMigrations(prisma: PrismaClient): Promise<number> {
  const [row] = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) AS total FROM _prisma_migrations`;
  return Number(row.total);
}
