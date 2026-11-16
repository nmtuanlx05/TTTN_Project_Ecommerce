import type { PrismaClient } from '../../src/generated/prisma/client';
import { startTestApp, TestApp } from './helpers/app';
import { postOrder, tally } from './helpers/checkout';
import {
  createBuyer,
  createSellableVariant,
  createVoucher,
} from './helpers/factories';
import {
  assertConnectedToTestDatabase,
  createTestPrisma,
} from './helpers/prisma-client';
import { resetDatabase } from './helpers/reset-db';

// Nhóm (b): lượt voucher cuối. Nhiều khách dùng CÙNG MỘT mã khi chỉ còn ít lượt, đặt đơn cùng lúc qua HTTP.
// Mỗi khách có biến thể (và tồn) RIÊNG, nên giới hạn duy nhất là lượt voucher, không lẫn với tranh chấp tồn kho.
// Điểm cần chứng minh: số đơn dùng mã đúng bằng số lượt, usedCount không bao giờ vượt usageLimit
// (CHECK chk_vouchers_usage_limit), không "mất lượt đếm" khi cập nhật đồng thời, và đơn bị từ chối vì hết lượt
// KHÔNG giữ chỗ tồn kho (transaction rollback trọn vẹn).

const SUBTOTAL = 200_000; // dưới ngưỡng miễn phí ship 500.000 nên phí ship = 30.000
const SHIPPING = 30_000;
const DISCOUNT = 10_000;
const USAGE_LIMIT_ERROR = '400:VOUCHER_USAGE_LIMIT';

describe('Checkout đồng thời: lượt voucher (MySQL thật)', () => {
  let prisma: PrismaClient;
  let testApp: TestApp;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await assertConnectedToTestDatabase(prisma);
    testApp = await startTestApp();
  });

  afterAll(async () => {
    await testApp.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  // Mỗi người mua có sản phẩm + biến thể riêng (tồn 1) và giỏ một dòng
  async function createBuyers(count: number) {
    return Promise.all(
      Array.from({ length: count }, async () => {
        const { variant } = await createSellableVariant(prisma, {
          price: SUBTOTAL,
          stock: 1,
        });
        const buyer = await createBuyer(prisma, [
          { variantId: variant.id, quantity: 1 },
        ]);
        return { userId: buyer.id, variantId: variant.id };
      }),
    );
  }

  it.each([1, 2, 3])(
    'vòng %i: voucher còn đúng 1 lượt, 10 khách đặt cùng lúc → đúng 1 đơn dùng được mã, 9 bị từ chối hết lượt',
    async () => {
      const voucher = await createVoucher(prisma, {
        usageLimit: 1,
        discountValue: DISCOUNT,
      });
      const buyers = await createBuyers(10);

      const results = await Promise.all(
        buyers.map((b) =>
          postOrder(testApp, b.userId, { voucherCode: voucher.code }),
        ),
      );

      expect(tally(results)).toEqual({ '201': 1, [USAGE_LIMIT_ERROR]: 9 });
      const fresh = await prisma.voucher.findUniqueOrThrow({
        where: { id: voucher.id },
      });
      expect(fresh.usedCount).toBe(1);
      expect(await prisma.order.count()).toBe(1);
      expect(
        await prisma.order.count({ where: { voucherId: voucher.id } }),
      ).toBe(1);
      // Đơn bị từ chối vì hết lượt không được giữ chỗ: tổng reserved chỉ bằng đơn thành công
      const reserved = await prisma.productVariant.aggregate({
        _sum: { reserved: true },
      });
      expect(reserved._sum.reserved).toBe(1);
    },
  );

  it('voucher còn 3 lượt, 15 khách đặt cùng lúc → đúng 3 đơn, mỗi đơn giảm và tính tiền đúng', async () => {
    const voucher = await createVoucher(prisma, {
      usageLimit: 3,
      discountValue: DISCOUNT,
    });
    const buyers = await createBuyers(15);

    const results = await Promise.all(
      buyers.map((b) =>
        postOrder(testApp, b.userId, { voucherCode: voucher.code }),
      ),
    );

    expect(tally(results)).toEqual({ '201': 3, [USAGE_LIMIT_ERROR]: 12 });
    const fresh = await prisma.voucher.findUniqueOrThrow({
      where: { id: voucher.id },
    });
    expect(fresh.usedCount).toBe(3);

    const orders = await prisma.order.findMany({
      where: { voucherId: voucher.id },
    });
    expect(orders).toHaveLength(3);
    for (const order of orders) {
      expect(order.voucherCode).toBe(voucher.code);
      expect(order.subtotal).toBe(SUBTOTAL);
      expect(order.shippingFee).toBe(SHIPPING);
      expect(order.discountAmount).toBe(DISCOUNT);
      expect(order.totalAmount).toBe(SUBTOTAL + SHIPPING - DISCOUNT);
    }
    expect(await prisma.order.count()).toBe(3);

    const reserved = await prisma.productVariant.aggregate({
      _sum: { reserved: true },
    });
    expect(reserved._sum.reserved).toBe(3);
    // Giỏ của khách bị từ chối còn nguyên (không bị đổi khi lỗi)
    const winners = new Set(orders.map((o) => o.userId));
    const losers = buyers.filter((b) => !winners.has(b.userId));
    expect(
      await prisma.cartItem.count({
        where: { cart: { userId: { in: losers.map((b) => b.userId) } } },
      }),
    ).toBe(12);
  });

  it('voucher không giới hạn lượt, 12 khách cùng lúc → cả 12 đơn thành công và usedCount đúng 12 (không mất lượt đếm)', async () => {
    const voucher = await createVoucher(prisma, {
      usageLimit: null,
      discountValue: DISCOUNT,
    });
    const buyers = await createBuyers(12);

    const results = await Promise.all(
      buyers.map((b) =>
        postOrder(testApp, b.userId, { voucherCode: voucher.code }),
      ),
    );

    expect(tally(results)).toEqual({ '201': 12 });
    const fresh = await prisma.voucher.findUniqueOrThrow({
      where: { id: voucher.id },
    });
    expect(fresh.usedCount).toBe(12);
    expect(await prisma.order.count({ where: { voucherId: voucher.id } })).toBe(
      12,
    );
  });
});
