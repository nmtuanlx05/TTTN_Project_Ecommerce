import { Prisma } from '../../src/generated/prisma/client';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { createSellableVariant } from './helpers/factories';
import {
  assertConnectedToTestDatabase,
  createTestPrisma,
} from './helpers/prisma-client';
import { resetDatabase } from './helpers/reset-db';

// Trả lời mục "chưa xác minh adapter áp dụng isolationLevel: ReadCommitted" của CLAUDE.md.
// OrdersService truyền { isolationLevel: ReadCommitted } cho $transaction. Test dùng CÙNG adapter (PrismaMariaDb)
// như PrismaService để kiểm tra MySQL thật sự chạy transaction ở mức đó.
//
// Vì sao đo bằng HÀNH VI chứ không đọc `SELECT @@transaction_isolation`: Prisma đặt mức cô lập cho transaction bằng
// `SET TRANSACTION ISOLATION LEVEL ...` (chỉ áp dụng cho MỘT transaction kế tiếp). Biến @@transaction_isolation là mức
// của PHIÊN nên vẫn báo REPEATABLE-READ ngay cả khi transaction đang chạy READ COMMITTED (lần chạy đầu tiên cho thấy đúng
// như vậy). Phép đo đáng tin là: trong transaction, đọc hai lần quanh một thay đổi đã commit từ kết nối khác.
//   READ COMMITTED  -> lần đọc thứ hai thấy giá trị mới;  REPEATABLE READ -> vẫn thấy giá trị cũ.

describe('Mức cô lập transaction với adapter MariaDB (MySQL thật)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await assertConnectedToTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  // Mở transaction, đọc tồn, cho một kết nối KHÁC sửa tồn thành 99 và commit, rồi đọc lại. Trả [lần đọc 1, lần đọc 2].
  async function readStockTwice(options?: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }): Promise<number[]> {
    const { variant } = await createSellableVariant(prisma, { stock: 10 });
    return prisma.$transaction(async (tx) => {
      const first = await tx.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
        select: { stock: true },
      });
      // Dùng prisma (không phải tx) => kết nối khác trong pool, commit ngay
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: 99 },
      });
      const second = await tx.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
        select: { stock: true },
      });
      return [first.stock, second.stock];
    }, options);
  }

  it('mức mặc định của phiên là REPEATABLE-READ', async () => {
    const [row] = await prisma.$queryRaw<
      { level: string }[]
    >`SELECT @@transaction_isolation AS level`;
    expect(row.level).toBe('REPEATABLE-READ');
  });

  it('không truyền mức cô lập → REPEATABLE READ: lần đọc thứ hai vẫn thấy giá trị cũ', async () => {
    expect(await readStockTwice()).toEqual([10, 10]);
  });

  it('truyền RepeatableRead → lần đọc thứ hai vẫn thấy giá trị cũ', async () => {
    expect(
      await readStockTwice({
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      }),
    ).toEqual([10, 10]);
  });

  it('truyền ReadCommitted (như OrdersService) → lần đọc thứ hai thấy giá trị MỚI đã commit', async () => {
    expect(
      await readStockTwice({
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }),
    ).toEqual([10, 99]);
  });

  // Pool có 5 kết nối: sau vài vòng mọi kết nối đều từng chạy một transaction ReadCommitted. Nếu mức cô lập "rò" sang
  // transaction sau trên cùng kết nối, một lần đọc mặc định sẽ thấy giá trị mới (sai).
  it('mức ReadCommitted KHÔNG rò sang transaction mặc định chạy sau trên cùng kết nối', async () => {
    for (let i = 0; i < 10; i++) {
      expect(
        await readStockTwice({
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }),
      ).toEqual([10, 99]);
      expect(await readStockTwice()).toEqual([10, 10]);
    }
  });
});
