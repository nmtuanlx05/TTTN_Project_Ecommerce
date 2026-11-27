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

// Nhóm (c): Idempotency-Key. Khách bấm đặt đơn nhiều lần / mạng thử lại: phải chỉ có MỘT đơn, MỘT lần giữ chỗ,
// MỘT lần tính lượt voucher. Mọi request đồng thời cùng key nhận lại đúng đơn đã tạo (HTTP 201 theo docs/api/orders.md).

describe('Checkout đồng thời: Idempotency-Key (MySQL thật)', () => {
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
    testApp.emailQueue.jobs.length = 0;
  });

  // Job thư "Đã nhận đơn hàng" đã được đặt (bỏ các loại job khác)
  const orderMailJobs = () =>
    testApp.emailQueue.jobs.filter((job) => job.type === 'order-confirmation');

  it.each([1, 2, 3])(
    'vòng %i: cùng khách, cùng key, 10 request đồng thời → đúng 1 đơn, mọi phản hồi cùng một mã đơn',
    async (round) => {
      const { variant } = await createSellableVariant(prisma, { stock: 10 });
      const buyer = await createBuyer(prisma, [
        { variantId: variant.id, quantity: 1 },
      ]);
      const voucher = await createVoucher(prisma, { usageLimit: 5 });
      const idempotencyKey = `idem-same-key-round-${round}`;

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          postOrder(testApp, buyer.id, {
            voucherCode: voucher.code,
            idempotencyKey,
          }),
        ),
      );

      expect(tally(results)).toEqual({ '201': 10 });
      const codes = new Set(results.map((r) => r.body.data?.code));
      expect(codes.size).toBe(1);

      // Dữ liệu: một đơn, một lần giữ chỗ, một lần tính lượt voucher, giỏ đã dọn
      expect(await prisma.order.count()).toBe(1);
      const order = await prisma.order.findFirstOrThrow();
      expect(order.idempotencyKey).toBe(idempotencyKey);
      expect(order.code).toBe([...codes][0]);
      expect(await prisma.orderItem.count()).toBe(1);
      expect(await prisma.orderStatusHistory.count()).toBe(1);
      const freshVariant = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      });
      expect(freshVariant.reserved).toBe(1);
      expect(freshVariant.stock).toBe(10);
      const freshVoucher = await prisma.voucher.findUniqueOrThrow({
        where: { id: voucher.id },
      });
      expect(freshVoucher.usedCount).toBe(1);
      expect(await prisma.cartItem.count()).toBe(0);
      // Thư xác nhận: đúng MỘT job cho đơn đó dù 10 request cùng key
      expect(orderMailJobs()).toEqual([
        { type: 'order-confirmation', data: { orderId: order.id } },
      ]);
    },
  );

  it('cùng khách nhưng mỗi request một key khác nhau, đồng thời → chỉ 1 đơn, các request còn lại thấy giỏ trống (409 CART_EMPTY)', async () => {
    const { variant } = await createSellableVariant(prisma, { stock: 10 });
    const buyer = await createBuyer(prisma, [
      { variantId: variant.id, quantity: 1 },
    ]);

    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        postOrder(testApp, buyer.id, {
          idempotencyKey: `idem-distinct-key-${i}`,
        }),
      ),
    );

    expect(tally(results)).toEqual({ '201': 1, '409:CART_EMPTY': 5 });
    expect(await prisma.order.count()).toBe(1);
    const order = await prisma.order.findFirstOrThrow();
    expect(orderMailJobs()).toEqual([
      { type: 'order-confirmation', data: { orderId: order.id } },
    ]);
    const freshVariant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.reserved).toBe(1);
  });

  it('không gửi key, bấm đặt nhiều lần đồng thời → chỉ 1 đơn, còn lại 409 CART_EMPTY', async () => {
    const { variant } = await createSellableVariant(prisma, { stock: 10 });
    const buyer = await createBuyer(prisma, [
      { variantId: variant.id, quantity: 1 },
    ]);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => postOrder(testApp, buyer.id)),
    );

    expect(tally(results)).toEqual({ '201': 1, '409:CART_EMPTY': 4 });
    expect(await prisma.order.count()).toBe(1);
    const order = await prisma.order.findFirstOrThrow();
    expect(orderMailJobs()).toEqual([
      { type: 'order-confirmation', data: { orderId: order.id } },
    ]);
  });

  it('gửi lại cùng key SAU khi đơn đã tạo (giỏ đã trống) → 201, cùng mã đơn, không giữ chỗ thêm', async () => {
    const { variant } = await createSellableVariant(prisma, { stock: 10 });
    const buyer = await createBuyer(prisma, [
      { variantId: variant.id, quantity: 2 },
    ]);
    const idempotencyKey = 'idem-replay-after-success';

    const first = await postOrder(testApp, buyer.id, { idempotencyKey });
    const order = await prisma.order.findFirstOrThrow();
    expect(orderMailJobs()).toEqual([
      { type: 'order-confirmation', data: { orderId: order.id } },
    ]);

    const second = await postOrder(testApp, buyer.id, { idempotencyKey });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data?.code).toBe(first.body.data?.code);
    expect(await prisma.order.count()).toBe(1);
    const freshVariant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.reserved).toBe(2);
    // Gửi lại cùng key: KHÔNG có job thứ hai
    expect(orderMailJobs()).toEqual([
      { type: 'order-confirmation', data: { orderId: order.id } },
    ]);
  });

  it('hai khách khác nhau dùng CÙNG một key đồng thời → cả hai đều có đơn riêng (key chỉ có nghĩa trong phạm vi từng khách)', async () => {
    const { variant } = await createSellableVariant(prisma, { stock: 10 });
    const buyerA = await createBuyer(prisma, [
      { variantId: variant.id, quantity: 1 },
    ]);
    const buyerB = await createBuyer(prisma, [
      { variantId: variant.id, quantity: 1 },
    ]);
    const idempotencyKey = 'idem-shared-by-two-users';

    const results = await Promise.all([
      postOrder(testApp, buyerA.id, { idempotencyKey }),
      postOrder(testApp, buyerB.id, { idempotencyKey }),
    ]);

    expect(tally(results)).toEqual({ '201': 2 });
    expect(results[0].body.data?.code).not.toBe(results[1].body.data?.code);
    expect(await prisma.order.count()).toBe(2);
    const orderIds = (await prisma.order.findMany({ select: { id: true } }))
      .map((o) => o.id)
      .sort((a, b) => a - b);
    expect(
      orderMailJobs()
        .map((job) => job.data.orderId)
        .sort((a, b) => a - b),
    ).toEqual(orderIds);
    expect(orderMailJobs()).toHaveLength(2);
    const freshVariant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.reserved).toBe(2);
  });
});
