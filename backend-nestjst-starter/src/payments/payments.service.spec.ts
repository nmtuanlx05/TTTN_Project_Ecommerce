// Mock của Jest có kiểu any nên test đọc calls/giá trị trả về cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { HttpException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { OrderStatus } from '../generated/prisma/enums';
import { PaymentsService } from './payments.service';
import type { AuthUser } from '../auth/auth.types';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../inventory/inventory.service', () => ({
  InventoryService: class {},
}));

// Prisma giả có trạng thái trong bộ nhớ, MÔ PHỎNG: transaction rollback khi có lỗi, câu khóa đơn được ghi lại để kiểm thứ tự.
// Khóa FOR UPDATE và đua thật trên MySQL CHƯA được test tự động; test này kiểm logic quyết định và thứ tự câu lệnh.

const ADMIN = { id: 1, role: 'ADMIN' } as unknown as AuthUser;
const CODE = 'MS-261105-PKGA';

interface FakeOrder {
  id: number;
  code: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  userId: number;
  paymentExpiresAt: Date | null;
  paidAt: Date | null;
}

const order = (over: Partial<FakeOrder> = {}): FakeOrder => ({
  id: 10,
  code: CODE,
  status: OrderStatus.PENDING_PAYMENT,
  paymentMethod: 'ONLINE',
  paymentStatus: 'UNPAID',
  totalAmount: 350_000,
  userId: 7,
  paymentExpiresAt: new Date(Date.now() + 20 * 60_000),
  paidAt: null,
  ...over,
});

const ONLINE = {
  enabled: true,
  bankBin: '970422',
  bankCode: 'MB',
  bankName: 'MB Bank',
  accountNo: '0123456789',
  accountName: 'CUA HANG',
  expireMinutes: 30,
};

function setup(
  orders: FakeOrder[] = [order()],
  online: Record<string, unknown> = ONLINE,
) {
  const db = { orders, txns: [] as any[] };
  const log: string[] = [];
  let nextId = 100;
  let createError: unknown = null;

  const findTxn = (where: any) => {
    if (where.id !== undefined)
      return db.txns.find((t) => t.id === where.id) ?? null;
    const key = where.provider_providerTxnId;
    return (
      db.txns.find(
        (t) =>
          t.provider === key.provider && t.providerTxnId === key.providerTxnId,
      ) ?? null
    );
  };

  const tx = {
    $queryRaw: jest.fn((sql: any) => {
      log.push('lock:order');
      const id = sql.values[0];
      const found = db.orders.find((o) => o.id === id);
      return Promise.resolve(found ? [{ ...found }] : []);
    }),
    order: {
      findUnique: jest.fn((args: any) =>
        Promise.resolve(
          db.orders.find((o) => o.code === args.where.code) ?? null,
        ),
      ),
    },
    paymentTransaction: {
      create: jest.fn((args: any) => {
        log.push('txn:create');
        if (createError) {
          const e = createError;
          createError = null;
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          return Promise.reject(e);
        }
        const row = {
          resolvedAt: null,
          resolvedById: null,
          resolutionNote: null,
          reviewReason: null,
          ...args.data,
          id: nextId++,
        };
        db.txns.push(row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn((args: any) => Promise.resolve(findTxn(args.where))),
      update: jest.fn((args: any) => {
        log.push('txn:update');
        Object.assign(findTxn(args.where), args.data);
        return Promise.resolve({});
      }),
    },
  };

  const workflow = {
    transition: jest.fn((_tx: unknown, input: any) => {
      log.push('workflow:transition');
      const o = db.orders.find((x) => x.id === input.orderId)!;
      o.status = input.to;
      o.paymentStatus = 'PAID';
      o.paidAt = input.now;
      return Promise.resolve();
    }),
  };

  const prisma = {
    $transaction: jest.fn(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      const before = structuredClone(db);
      try {
        return await arg(tx);
      } catch (error) {
        db.orders = before.orders;
        db.txns = before.txns;
        throw error;
      }
    }),
    order: {
      findFirst: jest.fn((args: any) =>
        Promise.resolve(
          db.orders.find(
            (o) => o.code === args.where.code && o.userId === args.where.userId,
          ) ?? null,
        ),
      ),
    },
    paymentTransaction: {
      findUnique: jest.fn((args: any) => Promise.resolve(findTxn(args.where))),
      findMany: jest.fn(() => Promise.resolve(db.txns)),
      count: jest.fn(() => Promise.resolve(db.txns.length)),
      updateMany: jest.fn((args: any) => {
        const t = db.txns.find(
          (x) => x.id === args.where.id && x.resolvedAt === null,
        );
        if (t) Object.assign(t, args.data);
        return Promise.resolve({ count: t ? 1 : 0 });
      }),
    },
  };

  const service = new PaymentsService(
    prisma as never,
    { online } as never,
    workflow as never,
  );
  return {
    service,
    prisma,
    tx,
    workflow,
    db,
    log,
    failNextCreateWith: (e: unknown) => (createError = e),
  };
}

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const ex = error as HttpException;
    const body = ex.getResponse() as { code?: string; message: string };
    return { status: ex.getStatus(), ...body };
  }
  throw new Error('Kỳ vọng ném lỗi');
}

const webhook = (over: Record<string, unknown> = {}) => ({
  source: 'SEPAY' as const,
  providerTxnId: '9001',
  amount: 350_000,
  content: 'MS261105PKGA',
  rawPayload: { id: 9001 },
  ...over,
});

describe('PaymentsService.confirmBankTransfer', () => {
  describe('quy tắc số tiền', () => {
    it('đủ tiền → xác nhận: PENDING_PAYMENT → PENDING, PAID, giao dịch SUCCESS, lịch sử "Đã nhận chuyển khoản"', async () => {
      const { service, db, workflow } = setup();
      const result = await service.confirmBankTransfer(webhook());
      expect(result).toMatchObject({
        result: 'CONFIRMED',
        orderCode: CODE,
        overpaid: false,
      });
      expect(db.orders[0].status).toBe(OrderStatus.PENDING);
      expect(db.orders[0].paymentStatus).toBe('PAID');
      expect(db.txns[0]).toMatchObject({
        orderId: 10,
        status: 'SUCCESS',
        provider: 'SEPAY',
        providerTxnId: '9001',
        amount: 350_000,
        reviewReason: null,
      });
      const call = workflow.transition.mock.calls[0][1];
      expect(call).toMatchObject({
        orderId: 10,
        to: OrderStatus.PENDING,
        actor: { id: null, role: 'SYSTEM' },
        reason: 'Đã nhận chuyển khoản',
        paymentRef: '9001',
      });
    });

    it('thừa tiền → vẫn xác nhận, đánh dấu OVERPAID để admin xem', async () => {
      const { service, db } = setup();
      const result = await service.confirmBankTransfer(
        webhook({ amount: 400_000 }),
      );
      expect(result).toMatchObject({ result: 'CONFIRMED', overpaid: true });
      expect(db.orders[0].paymentStatus).toBe('PAID');
      expect(db.txns[0]).toMatchObject({
        status: 'SUCCESS',
        reviewReason: 'OVERPAID',
        resolvedAt: null,
      });
    });

    it('thiếu tiền → KHÔNG xác nhận, ghi NEEDS_REVIEW + UNDERPAID gắn đơn', async () => {
      const { service, db, workflow } = setup();
      const result = await service.confirmBankTransfer(
        webhook({ amount: 349_999 }),
      );
      expect(result).toMatchObject({
        result: 'NEEDS_REVIEW',
        reviewReason: 'UNDERPAID',
        orderCode: CODE,
      });
      expect(workflow.transition).not.toHaveBeenCalled();
      expect(db.orders[0].status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(db.orders[0].paymentStatus).toBe('UNPAID');
      expect(db.txns[0]).toMatchObject({
        orderId: 10,
        status: 'NEEDS_REVIEW',
        reviewReason: 'UNDERPAID',
      });
    });
  });

  describe('đơn không còn chờ thanh toán', () => {
    it('đơn đã hủy/hết hạn → không mở lại, NEEDS_REVIEW + ORDER_CLOSED', async () => {
      const { service, db, workflow } = setup([
        order({ status: OrderStatus.CANCELLED }),
      ]);
      const result = await service.confirmBankTransfer(webhook());
      expect(result).toMatchObject({
        result: 'NEEDS_REVIEW',
        reviewReason: 'ORDER_CLOSED',
      });
      expect(workflow.transition).not.toHaveBeenCalled();
      expect(db.orders[0].status).toBe(OrderStatus.CANCELLED);
      expect(db.orders[0].paymentStatus).toBe('UNPAID');
    });

    it('đơn đã PAID nhận thêm một khoản → DUPLICATE_PAID, không đổi đơn', async () => {
      const { service, db, workflow } = setup([
        order({ status: OrderStatus.PENDING, paymentStatus: 'PAID' }),
      ]);
      const result = await service.confirmBankTransfer(webhook());
      expect(result).toMatchObject({
        result: 'NEEDS_REVIEW',
        reviewReason: 'DUPLICATE_PAID',
      });
      expect(workflow.transition).not.toHaveBeenCalled();
      expect(db.txns[0].status).toBe('NEEDS_REVIEW');
    });

    it('tiền về muộn khi đơn VẪN PENDING_PAYMENT (quá hạn nhưng tác vụ chưa chạy) → vẫn xác nhận', async () => {
      const { service, db } = setup([
        order({ paymentExpiresAt: new Date(Date.now() - 5 * 60_000) }),
      ]);
      const result = await service.confirmBankTransfer(webhook());
      expect(result.result).toBe('CONFIRMED');
      expect(db.orders[0].status).toBe(OrderStatus.PENDING);
    });

    it('mã đơn của đơn COD → coi là không khớp (UNMATCHED) nhưng vẫn gắn đơn để admin thấy', async () => {
      const { service, db, workflow } = setup([
        order({ paymentMethod: 'COD', status: OrderStatus.PENDING }),
      ]);
      const result = await service.confirmBankTransfer(webhook());
      expect(result).toMatchObject({
        result: 'NEEDS_REVIEW',
        reviewReason: 'UNMATCHED',
      });
      expect(workflow.transition).not.toHaveBeenCalled();
      expect(db.txns[0].orderId).toBe(10);
    });
  });

  describe('khớp đơn theo nội dung chuyển khoản gốc', () => {
    it.each([
      ['ms261105pkga'],
      ['MS-261105-PKGA'],
      ['NGUYEN VAN A MS261105PKGA FT24123'],
    ])('"%s" khớp', async (content) => {
      const { service } = setup();
      const result = await service.confirmBankTransfer(webhook({ content }));
      expect(result.result).toBe('CONFIRMED');
    });

    it.each([[''], ['chuyen tien mua ao'], ['MS261105PKGA MS261106ABCD']])(
      '"%s" không khớp → UNMATCHED, orderId null, không khóa đơn nào',
      async (content) => {
        const { service, db, tx } = setup();
        const result = await service.confirmBankTransfer(webhook({ content }));
        expect(result).toMatchObject({
          result: 'NEEDS_REVIEW',
          orderCode: null,
          reviewReason: 'UNMATCHED',
        });
        expect(db.txns[0]).toMatchObject({
          orderId: null,
          status: 'NEEDS_REVIEW',
        });
        expect(tx.$queryRaw).not.toHaveBeenCalled();
      },
    );

    it('mã đơn đúng định dạng nhưng không có trong DB → UNMATCHED', async () => {
      const { service } = setup();
      const result = await service.confirmBankTransfer(
        webhook({ content: 'MS261105ZZZZ' }),
      );
      expect(result).toMatchObject({
        result: 'NEEDS_REVIEW',
        reviewReason: 'UNMATCHED',
      });
    });
  });

  describe('idempotent theo (provider, providerTxnId)', () => {
    it('gửi lại cùng id → DUPLICATE, không xử lý lần hai, không thêm dòng', async () => {
      const { service, db, workflow, prisma } = setup();
      const first = await service.confirmBankTransfer(webhook());
      const second = await service.confirmBankTransfer(webhook());
      expect(first.result).toBe('CONFIRMED');
      expect(second).toEqual({
        result: 'DUPLICATE',
        transactionId: db.txns[0].id,
      });
      expect(workflow.transition).toHaveBeenCalledTimes(1);
      expect(db.txns).toHaveLength(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('cùng id nhưng provider khác không bị coi là trùng', async () => {
      const { service, db } = setup([
        order(),
        order({ id: 11, code: 'MS-261105-ABCD' }),
      ]);
      await service.confirmBankTransfer(webhook());
      await service.confirmBankTransfer(
        webhook({ source: 'MANUAL' as const, orderId: 11 }),
      );
      expect(db.txns).toHaveLength(2);
    });

    it('hai webhook cùng id đua nhau: lần hai thua ở ràng buộc duy nhất (P2002) → DUPLICATE', async () => {
      const { service, db, tx, failNextCreateWith } = setup();
      // Mô phỏng: lần kiểm trước ngoài transaction chưa thấy, nhưng dòng của request kia đã được chèn khi ta ghi
      db.txns.push({ id: 5, provider: 'SEPAY', providerTxnId: '9001' });
      const real = tx.paymentTransaction.create;
      void real;
      failNextCreateWith(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      // Ẩn dòng 5 ở lần kiểm đầu: dùng findUnique trả null một lần
      const { prisma } = { prisma: (service as any).prisma };
      prisma.paymentTransaction.findUnique.mockResolvedValueOnce(null);
      const result = await service.confirmBankTransfer(webhook());
      expect(result).toEqual({ result: 'DUPLICATE', transactionId: 5 });
      expect(db.orders[0].paymentStatus).toBe('UNPAID');
    });

    it('lỗi khác P2002 không bị nuốt', async () => {
      const { service, failNextCreateWith } = setup();
      failNextCreateWith(new Error('boom'));
      await expect(service.confirmBankTransfer(webhook())).rejects.toThrow(
        'boom',
      );
    });
  });

  describe('khóa và giao dịch', () => {
    it('khóa đơn FOR UPDATE rồi mới ghi giao dịch và đổi trạng thái, trong một $transaction', async () => {
      const { service, log, prisma, tx } = setup();
      await service.confirmBankTransfer(webhook());
      expect(log).toEqual(['lock:order', 'txn:create', 'workflow:transition']);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const sql = tx.$queryRaw.mock.calls[0][0].sql;
      expect(sql).toContain('FROM orders');
      expect(sql).toContain('FOR UPDATE');
    });

    it('lỗi giữa chừng thì rollback cả giao dịch lẫn đơn', async () => {
      const { service, db, workflow } = setup();
      workflow.transition.mockRejectedValueOnce(new Error('workflow lỗi'));
      await expect(service.confirmBankTransfer(webhook())).rejects.toThrow();
      expect(db.txns).toHaveLength(0);
      expect(db.orders[0].paymentStatus).toBe('UNPAID');
    });

    it('P2034 (deadlock) được thử lại', async () => {
      const { service, prisma, db } = setup();
      const original = prisma.$transaction.getMockImplementation()!;
      prisma.$transaction.mockImplementationOnce(() => {
        throw new Prisma.PrismaClientKnownRequestError('deadlock', {
          code: 'P2034',
          clientVersion: 'test',
        });
      });
      prisma.$transaction.mockImplementation(original);
      const result = await service.confirmBankTransfer(webhook());
      expect(result.result).toBe('CONFIRMED');
      expect(db.txns).toHaveLength(1);
    });
  });
});

describe('PaymentsService.confirmManually (admin)', () => {
  it('ghi nhận đủ tổng đơn, provider MANUAL, người xác nhận vào lịch sử kèm ghi chú', async () => {
    const { service, db, workflow } = setup();
    const result = await service.confirmManually(
      10,
      { note: 'FT24999 đã kiểm tra sao kê' },
      ADMIN,
    );
    expect(result).toMatchObject({ result: 'CONFIRMED', orderCode: CODE });
    expect(db.txns[0]).toMatchObject({
      provider: 'MANUAL',
      providerTxnId: null,
      amount: 350_000,
      status: 'SUCCESS',
    });
    const call = workflow.transition.mock.calls[0][1];
    expect(call.actor).toEqual({ id: 1, role: 'SYSTEM' });
    expect(call.reason).toContain('Đã nhận chuyển khoản');
    expect(call.reason).toContain('FT24999');
    expect(call.paymentRef).toBe(`MANUAL-${db.txns[0].id}`);
  });

  it.each([
    ['đã hủy', { status: OrderStatus.CANCELLED }],
    ['đã PAID', { status: OrderStatus.PENDING, paymentStatus: 'PAID' }],
    ['là đơn COD', { paymentMethod: 'COD', status: OrderStatus.PENDING }],
  ])(
    'đơn %s → 409 ORDER_NOT_AWAITING_PAYMENT, không ghi giao dịch',
    async (_n, over) => {
      const { service, db, workflow } = setup([order(over)]);
      expect(
        await errorOf(service.confirmManually(10, { note: 'x' }, ADMIN)),
      ).toMatchObject({ status: 409, code: 'ORDER_NOT_AWAITING_PAYMENT' });
      expect(db.txns).toHaveLength(0);
      expect(workflow.transition).not.toHaveBeenCalled();
    },
  );

  it('đơn không tồn tại → 404 ORDER_NOT_FOUND', async () => {
    const { service } = setup();
    expect(
      await errorOf(service.confirmManually(999, { note: 'x' }, ADMIN)),
    ).toMatchObject({ status: 404, code: 'ORDER_NOT_FOUND' });
  });

  it('gắn giao dịch thiếu tiền đang chờ xử lý: đánh dấu đã xử lý bởi admin và gắn đơn', async () => {
    const { service, db } = setup();
    await service.confirmBankTransfer(webhook({ amount: 100_000 })); // UNDERPAID
    const pendingId = db.txns[0].id;
    await service.confirmManually(
      10,
      { note: 'Khách chuyển bù, đã kiểm tra', transactionId: pendingId },
      ADMIN,
    );
    expect(db.orders[0].paymentStatus).toBe('PAID');
    expect(db.txns[0]).toMatchObject({
      resolvedById: 1,
      resolutionNote: 'Khách chuyển bù, đã kiểm tra',
    });
    expect(db.txns[0].resolvedAt).toBeInstanceOf(Date);
  });

  it('giao dịch chờ xử lý gắn với đơn khác → 400 PAYMENT_TXN_ORDER_MISMATCH và rollback', async () => {
    const { service, db } = setup([
      order(),
      order({ id: 11, code: 'MS-261105-ABCD' }),
    ]);
    await service.confirmBankTransfer(
      webhook({ content: 'MS261105ABCD', amount: 1 }),
    );
    const pendingId = db.txns[0].id;
    expect(
      await errorOf(
        service.confirmManually(
          10,
          { note: 'x', transactionId: pendingId },
          ADMIN,
        ),
      ),
    ).toMatchObject({ status: 400, code: 'PAYMENT_TXN_ORDER_MISMATCH' });
    expect(db.orders[0].paymentStatus).toBe('UNPAID');
  });

  it('transactionId không tồn tại → 404; đã xử lý → 409', async () => {
    const { service, db } = setup();
    expect(
      await errorOf(
        service.confirmManually(10, { note: 'x', transactionId: 555 }, ADMIN),
      ),
    ).toMatchObject({ status: 404, code: 'PAYMENT_TXN_NOT_FOUND' });
    db.txns.push({
      id: 7,
      orderId: null,
      reviewReason: 'UNMATCHED',
      resolvedAt: new Date(),
    });
    expect(
      await errorOf(
        service.confirmManually(10, { note: 'x', transactionId: 7 }, ADMIN),
      ),
    ).toMatchObject({ status: 409, code: 'PAYMENT_TXN_ALREADY_RESOLVED' });
  });
});

describe('PaymentsService.resolveTransaction', () => {
  it('đánh dấu đã xử lý; lần hai → 409 PAYMENT_TXN_ALREADY_RESOLVED', async () => {
    const { service, db } = setup();
    db.txns.push({
      id: 7,
      reviewReason: 'UNMATCHED',
      resolvedAt: null,
      resolvedById: null,
    });
    expect(
      await service.resolveTransaction(7, { note: 'Đã hoàn tiền tay' }, ADMIN),
    ).toEqual({ id: 7, resolved: true });
    expect(db.txns[0]).toMatchObject({
      resolvedById: 1,
      resolutionNote: 'Đã hoàn tiền tay',
    });
    expect(
      await errorOf(service.resolveTransaction(7, { note: 'lại' }, ADMIN)),
    ).toMatchObject({ status: 409, code: 'PAYMENT_TXN_ALREADY_RESOLVED' });
  });

  it('không tồn tại → 404; giao dịch không cần xử lý (reviewReason null) → 409', async () => {
    const { service, db } = setup();
    expect(
      await errorOf(service.resolveTransaction(99, { note: 'x' }, ADMIN)),
    ).toMatchObject({ status: 404, code: 'PAYMENT_TXN_NOT_FOUND' });
    db.txns.push({ id: 8, reviewReason: null, resolvedAt: null });
    expect(
      await errorOf(service.resolveTransaction(8, { note: 'x' }, ADMIN)),
    ).toMatchObject({ status: 409, code: 'PAYMENT_TXN_NOT_REVIEWABLE' });
  });

  it('danh sách không chọn rawData (có thể chứa số tài khoản)', async () => {
    const { service, prisma } = setup();
    await service.listTransactions({ page: 1, limit: 10, review: 'pending' });
    const select = prisma.paymentTransaction.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('rawData');
    const where = prisma.paymentTransaction.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ reviewReason: { not: null }, resolvedAt: null });
  });
});

describe('PaymentsService.getOrderPayment', () => {
  it('đang chờ: trả số tiền, nội dung, ngân hàng, tài khoản, hạn và qrPayload', async () => {
    const { service } = setup();
    const info: any = await service.getOrderPayment(7, CODE);
    expect(info).toMatchObject({
      state: 'AWAITING_PAYMENT',
      orderCode: CODE,
      amount: 350_000,
      transfer: {
        content: 'MS261105PKGA',
        bank: { bin: '970422', code: 'MB', name: 'MB Bank' },
        accountNo: '0123456789',
        accountName: 'CUA HANG',
      },
    });
    expect(info.expiresAt).toBeInstanceOf(Date);
    expect(info.transfer.qrPayload).toContain('540635000');
    expect(info.transfer.qrPayload).toContain('0812MS261105PKGA');
  });

  it('đã trả → PAID, không lộ thông tin tài khoản/QR', async () => {
    const { service } = setup([
      order({ status: OrderStatus.PENDING, paymentStatus: 'PAID' }),
    ]);
    const info: any = await service.getOrderPayment(7, CODE);
    expect(info.state).toBe('PAID');
    expect(info).not.toHaveProperty('transfer');
  });

  it('quá hạn (tính khi đọc, không ghi DB) → EXPIRED; đã hủy → CANCELLED', async () => {
    const expired = setup([
      order({ paymentExpiresAt: new Date(Date.now() - 1000) }),
    ]);
    const a: any = await expired.service.getOrderPayment(7, CODE);
    expect(a.state).toBe('EXPIRED');
    expect(a).not.toHaveProperty('transfer');
    expect(expired.prisma.$transaction).not.toHaveBeenCalled();

    const cancelled = setup([order({ status: OrderStatus.CANCELLED })]);
    expect(
      ((await cancelled.service.getOrderPayment(7, CODE)) as any).state,
    ).toBe('CANCELLED');
  });

  it('đơn của người khác → 404; đơn COD → 409 ORDER_NOT_ONLINE', async () => {
    const { service } = setup();
    expect(await errorOf(service.getOrderPayment(8, CODE))).toMatchObject({
      status: 404,
      code: 'ORDER_NOT_FOUND',
    });
    const cod = setup([order({ paymentMethod: 'COD' })]);
    expect(await errorOf(cod.service.getOrderPayment(7, CODE))).toMatchObject({
      status: 409,
      code: 'ORDER_NOT_ONLINE',
    });
  });

  it('ONLINE đang tắt khi đơn còn chờ → 409 PAYMENT_METHOD_NOT_SUPPORTED, không lộ tên biến', async () => {
    const { service } = setup([order()], {
      enabled: false,
      reason: 'VIETQR_X',
    });
    const e = await errorOf(service.getOrderPayment(7, CODE));
    expect(e).toMatchObject({
      status: 409,
      code: 'PAYMENT_METHOD_NOT_SUPPORTED',
    });
    expect(e.message).not.toContain('VIETQR');
  });
});
