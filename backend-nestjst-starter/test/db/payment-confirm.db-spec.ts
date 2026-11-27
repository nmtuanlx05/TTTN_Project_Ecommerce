import type { PrismaClient } from '../../src/generated/prisma/client';
import {
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  Role,
} from '../../src/generated/prisma/enums';
import request from 'supertest';
import { startTestApp, TestApp } from './helpers/app';
import { HttpResult, tally } from './helpers/checkout';
import { createOnlineOrder, createUser } from './helpers/factories';
import {
  assertConnectedToTestDatabase,
  createTestPrisma,
} from './helpers/prisma-client';
import { resetDatabase } from './helpers/reset-db';

// Admin xác nhận chuyển khoản (POST /admin/orders/:id/confirm-payment) trên AppModule thật + MySQL thật.
// Điểm cần chứng minh: nhiều request đồng thời cho CÙNG một đơn chỉ một request đổi trạng thái (khóa dòng đơn FOR UPDATE
// rồi kiểm lại), các request còn lại 409 ORDER_NOT_AWAITING_PAYMENT, và thư "Đã nhận thanh toán" được đặt ĐÚNG một job.
// Webhook SePay đi qua cùng hàm confirmBankTransfer nhưng không được test ở đây (cần SEPAY_WEBHOOK_API_KEY lúc khởi động).

describe('Xác nhận thanh toán đồng thời + thư đã nhận thanh toán (MySQL thật)', () => {
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

  const paymentJobs = () =>
    testApp.emailQueue.jobs.filter((job) => job.type === 'payment-received');

  async function confirmAsAdmin(
    adminId: number,
    orderId: number,
    note: string,
  ): Promise<HttpResult> {
    const res = await request(testApp.baseUrl)
      .post(`/admin/orders/${orderId}/confirm-payment`)
      .set('Authorization', `Bearer ${testApp.tokenFor(adminId, 'ADMIN')}`)
      .send({ note });
    return { status: res.status, body: res.body as HttpResult['body'] };
  }

  it('5 admin xác nhận CÙNG một đơn đồng thời → đúng 1 thành công, 4 bị từ chối, đúng 1 job', async () => {
    const admin = await createUser(prisma, { role: Role.ADMIN });
    const order = await createOnlineOrder(prisma);

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        confirmAsAdmin(admin.id, order.id, `Đã thấy tiền về (lần ${i + 1})`),
      ),
    );

    expect(tally(results)).toEqual({
      '200': 1,
      '409:ORDER_NOT_AWAITING_PAYMENT': 4,
    });
    const fresh = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(fresh.status).toBe(OrderStatus.PENDING);
    expect(fresh.paymentStatus).toBe(PaymentStatus.PAID);
    expect(fresh.paidAt).not.toBeNull();
    // Một giao dịch SUCCESS, một dòng lịch sử PENDING_PAYMENT → PENDING
    expect(await prisma.paymentTransaction.count()).toBe(1);
    const txn = await prisma.paymentTransaction.findFirstOrThrow();
    expect(txn.status).toBe(PaymentTransactionStatus.SUCCESS);
    expect(txn.orderId).toBe(order.id);
    expect(
      await prisma.orderStatusHistory.count({
        where: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING_PAYMENT,
          toStatus: OrderStatus.PENDING,
        },
      }),
    ).toBe(1);

    expect(paymentJobs()).toEqual([
      { type: 'payment-received', data: { orderId: order.id } },
    ]);
    expect(testApp.emailQueue.jobs).toHaveLength(1);
  });

  it('xác nhận lần hai SAU khi đã xong → 409, không có job mới', async () => {
    const admin = await createUser(prisma, { role: Role.ADMIN });
    const order = await createOnlineOrder(prisma);

    const first = await confirmAsAdmin(admin.id, order.id, 'Lần một');
    expect(first.status).toBe(200);
    expect(paymentJobs()).toEqual([
      { type: 'payment-received', data: { orderId: order.id } },
    ]);

    const second = await confirmAsAdmin(admin.id, order.id, 'Lần hai');
    expect(tally([second])).toEqual({ '409:ORDER_NOT_AWAITING_PAYMENT': 1 });
    expect(paymentJobs()).toEqual([
      { type: 'payment-received', data: { orderId: order.id } },
    ]);
    expect(testApp.emailQueue.jobs).toHaveLength(1);
    expect(await prisma.paymentTransaction.count()).toBe(1);
  });
});
