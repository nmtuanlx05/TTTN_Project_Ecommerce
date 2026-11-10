// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { ConflictException, HttpException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { OrderStatus } from '../generated/prisma/enums';
import { OrderWorkflowService } from './order-workflow.service';
import type { OrderActor } from './orders.rules';

jest.mock('../inventory/inventory.service', () => ({
  InventoryService: class {},
}));

const NOW = new Date('2026-12-06T03:00:00.000Z');
const sqlText = (call: unknown[]) => (call[0] as { sql: string }).sql;

interface FakeOrder {
  id: number;
  code: string;
  status: OrderStatus;
  voucherId: number | null;
  paymentMethod: 'COD' | 'ONLINE';
  paymentStatus: 'UNPAID' | 'PAID';
}

function setup(order: Partial<FakeOrder> | null = {}) {
  const state: FakeOrder | null =
    order === null
      ? null
      : {
          id: 1,
          code: 'MS-261105-ABCD',
          status: OrderStatus.PENDING,
          voucherId: 9,
          paymentMethod: 'COD',
          paymentStatus: 'UNPAID',
          ...order,
        };
  const calls: string[] = [];
  const tx = {
    $queryRaw: jest.fn((sql: { sql: string }) => {
      calls.push(
        sql.sql.includes('FROM orders') ? 'lock:order' : 'lock:variants',
      );
      return Promise.resolve(
        sql.sql.includes('FROM orders') ? (state ? [{ ...state }] : []) : [],
      );
    }),
    $executeRaw: jest.fn((sql: { sql: string }) => {
      calls.push(
        sql.sql.includes('UPDATE vouchers')
          ? 'voucher:release'
          : 'variant:release',
      );
      return Promise.resolve(1);
    }),
    orderItem: {
      findMany: jest.fn().mockResolvedValue([
        { variantId: 5, quantity: 2 },
        { variantId: 8, quantity: 1 },
      ]),
    },
    order: {
      update: jest.fn((args: { data: { status: OrderStatus } }) => {
        if (state) state.status = args.data.status;
        calls.push('order:update');
        return Promise.resolve({});
      }),
    },
    orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
  };
  const inventory = { shipOut: jest.fn().mockResolvedValue({}) };
  const service = new OrderWorkflowService(inventory as never);
  const run = (
    to: OrderStatus,
    role: OrderActor = 'STAFF',
    reason: string | null = null,
    actorId: number | null = 42,
    paymentRef?: string,
  ) =>
    service.transition(tx as unknown as Prisma.TransactionClient, {
      orderId: 1,
      to,
      actor: { id: actorId, role },
      reason,
      now: NOW,
      paymentRef,
    });
  return { tx, inventory, run, state, calls };
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

describe('OrderWorkflowService.transition', () => {
  describe('hủy đơn', () => {
    it('trả giữ chỗ (giảm reserved theo variantId tăng dần) VÀ trả lượt voucher, trong một lần', async () => {
      const { tx, run, calls } = setup();
      await run(OrderStatus.CANCELLED, 'CUSTOMER', 'Khách tự hủy');

      // Thứ tự khóa cố định: đơn → biến thể → (cập nhật) → voucher
      expect(calls).toEqual([
        'lock:order',
        'lock:variants',
        'variant:release',
        'variant:release',
        'voucher:release',
        'order:update',
      ]);
      const releases = tx.$executeRaw.mock.calls.filter((c) =>
        sqlText(c).includes('UPDATE product_variants'),
      );
      expect(releases.map((c) => (c[0] as any).values)).toEqual([
        [2, 5, 2],
        [1, 8, 1],
      ]);
      expect(sqlText(releases[0])).toContain('reserved = reserved - ?');
      expect(sqlText(releases[0])).toContain('reserved >= ?');

      const voucherCall = tx.$executeRaw.mock.calls.find((c) =>
        sqlText(c).includes('UPDATE vouchers'),
      )!;
      expect(sqlText(voucherCall)).toContain('usedCount = usedCount - 1');
      expect(sqlText(voucherCall)).toContain('usedCount > 0');
      expect((voucherCall[0] as any).values).toEqual([9]);

      expect(tx.order.update.mock.calls[0][0].data).toEqual({
        status: 'CANCELLED',
        cancelReason: 'Khách tự hủy',
      });
      expect(tx.orderStatusHistory.create.mock.calls[0][0].data).toEqual({
        orderId: 1,
        fromStatus: 'PENDING',
        toStatus: 'CANCELLED',
        actorId: 42,
        reason: 'Khách tự hủy',
      });
    });

    it('đơn không dùng voucher: không đụng vouchers', async () => {
      const { tx, run } = setup({ voucherId: null });
      await run(OrderStatus.CANCELLED, 'CUSTOMER');
      expect(
        tx.$executeRaw.mock.calls.some((c) =>
          sqlText(c).includes('UPDATE vouchers'),
        ),
      ).toBe(false);
    });

    it('hủy hai lần: lần hai bị 409 và voucher chỉ được trả đúng một lần', async () => {
      const { tx, run } = setup();
      await run(OrderStatus.CANCELLED, 'STAFF', 'Hết hàng thực tế');
      const e = await errorOf(run(OrderStatus.CANCELLED, 'CUSTOMER'));

      expect(e.status).toBe(409);
      expect(e.code).toBe('ORDER_INVALID_TRANSITION');
      const voucherReleases = tx.$executeRaw.mock.calls.filter((c) =>
        sqlText(c).includes('UPDATE vouchers'),
      );
      expect(voucherReleases).toHaveLength(1);
      expect(tx.order.update).toHaveBeenCalledTimes(1);
    });

    it('khách hủy đơn đã CONFIRMED → 409 với code riêng (không phải 403), không đổi kho', async () => {
      const { tx, run } = setup({ status: OrderStatus.CONFIRMED });
      const e = await errorOf(run(OrderStatus.CANCELLED, 'CUSTOMER'));

      expect(e.status).toBe(409);
      expect(e.code).toBe('ORDER_NOT_CANCELLABLE_BY_CUSTOMER');
      expect(tx.$executeRaw).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it.each([
      OrderStatus.CONFIRMED,
      OrderStatus.SHIPPING,
      OrderStatus.COMPLETED,
    ])(
      'khách hủy đơn %s → 409 ORDER_NOT_CANCELLABLE_BY_CUSTOMER, không đổi gì',
      async (status) => {
        const { tx, run } = setup({ status });
        const e = await errorOf(run(OrderStatus.CANCELLED, 'CUSTOMER'));
        expect(e.status).toBe(409);
        expect(e.code).toBe('ORDER_NOT_CANCELLABLE_BY_CUSTOMER');
        expect(tx.order.update).not.toHaveBeenCalled();
      },
    );

    it('khách hủy đơn PENDING được', async () => {
      const { tx, run } = setup({ status: OrderStatus.PENDING });
      await run(OrderStatus.CANCELLED, 'CUSTOMER', 'Đổi ý');
      expect(tx.order.update.mock.calls[0][0].data.status).toBe('CANCELLED');
    });

    it.each([
      ['STAFF', OrderStatus.PENDING],
      ['STAFF', OrderStatus.CONFIRMED],
      ['ADMIN', OrderStatus.PENDING],
      ['ADMIN', OrderStatus.CONFIRMED],
    ] as const)(
      '%s hủy đơn %s được: chỉ nhả reserved, không đụng stock',
      async (role, status) => {
        const { tx, inventory, run } = setup({ status });
        await run(OrderStatus.CANCELLED, role, 'Khách đổi ý qua điện thoại');
        expect(tx.order.update).toHaveBeenCalled();
        expect(tx.order.update.mock.calls[0][0].data.cancelReason).toBe(
          'Khách đổi ý qua điện thoại',
        );
        expect(inventory.shipOut).not.toHaveBeenCalled();
        const sqls = tx.$executeRaw.mock.calls.map((c) => sqlText(c));
        expect(sqls.some((t) => t.includes('SET reserved = reserved -'))).toBe(
          true,
        );
        expect(sqls.some((t) => t.includes('stock = stock -'))).toBe(false);
      },
    );

    it.each(['STAFF', 'ADMIN'] as const)(
      '%s không hủy được đơn SHIPPING hoặc COMPLETED (409 ORDER_INVALID_TRANSITION), không đổi kho',
      async (role) => {
        for (const status of [OrderStatus.SHIPPING, OrderStatus.COMPLETED]) {
          const { tx, run } = setup({ status });
          const e = await errorOf(run(OrderStatus.CANCELLED, role, 'x'));
          expect(e.status).toBe(409);
          expect(e.code).toBe('ORDER_INVALID_TRANSITION');
          expect(tx.$executeRaw).not.toHaveBeenCalled();
          expect(tx.order.update).not.toHaveBeenCalled();
        }
      },
    );

    it('reserved không đủ để trả (dữ liệu lệch) → 409 và không đổi trạng thái', async () => {
      const { tx, run } = setup();
      tx.$executeRaw.mockImplementation(() => Promise.resolve(0));
      await expect(
        run(OrderStatus.CANCELLED, 'STAFF', 'x'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.order.update).not.toHaveBeenCalled();
    });
  });

  describe('các bước khác', () => {
    it('PENDING → CONFIRMED gán handledById, không đổi kho', async () => {
      const { tx, inventory, run } = setup();
      await run(OrderStatus.CONFIRMED, 'STAFF');
      expect(tx.order.update.mock.calls[0][0].data).toEqual({
        status: 'CONFIRMED',
        handledById: 42,
      });
      expect(inventory.shipOut).not.toHaveBeenCalled();
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('CONFIRMED → SHIPPING xuất kho từng biến thể theo id tăng dần, kèm người thao tác và mã đơn', async () => {
      const { tx, inventory, run } = setup({ status: OrderStatus.CONFIRMED });
      await run(OrderStatus.SHIPPING, 'STAFF');
      expect(inventory.shipOut.mock.calls.map((c) => c.slice(1))).toEqual([
        [5, 2, 42, 'MS-261105-ABCD'],
        [8, 1, 42, 'MS-261105-ABCD'],
      ]);
      expect(inventory.shipOut.mock.calls[0][0]).toBe(tx);
      expect(tx.order.update.mock.calls[0][0].data).toEqual({
        status: 'SHIPPING',
      });
    });

    it('xác nhận (PENDING → CONFIRMED) và hoàn tất không xuất kho', async () => {
      const { inventory, run } = setup();
      await run(OrderStatus.CONFIRMED, 'STAFF');
      expect(inventory.shipOut).not.toHaveBeenCalled();
    });

    it('xuất kho thất bại thì lỗi lan ra (cả transaction rollback), không đổi trạng thái', async () => {
      const { tx, inventory, run } = setup({ status: OrderStatus.CONFIRMED });
      inventory.shipOut.mockRejectedValue(new ConflictException('không đủ'));
      await expect(run(OrderStatus.SHIPPING)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
    });

    it('SHIPPING → COMPLETED với COD chưa thanh toán: paymentStatus = PAID, paidAt = now', async () => {
      const { tx, run } = setup({ status: OrderStatus.SHIPPING });
      await run(OrderStatus.COMPLETED);
      expect(tx.order.update.mock.calls[0][0].data).toEqual({
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        paidAt: NOW,
      });
    });

    it('đơn đã trả tiền thì COMPLETED không ghi đè paidAt', async () => {
      const { tx, run } = setup({
        status: OrderStatus.SHIPPING,
        paymentStatus: 'PAID',
      });
      await run(OrderStatus.COMPLETED);
      expect(tx.order.update.mock.calls[0][0].data).toEqual({
        status: 'COMPLETED',
      });
    });
  });

  describe('chuyển sai', () => {
    it.each([
      [OrderStatus.PENDING, OrderStatus.SHIPPING],
      [OrderStatus.PENDING, OrderStatus.COMPLETED],
      [OrderStatus.CONFIRMED, OrderStatus.COMPLETED],
      [OrderStatus.SHIPPING, OrderStatus.CONFIRMED],
      [OrderStatus.COMPLETED, OrderStatus.SHIPPING],
      [OrderStatus.CANCELLED, OrderStatus.PENDING],
      [OrderStatus.SHIPPING, OrderStatus.RETURNED],
    ])(
      '%s → %s trả 409 ORDER_INVALID_TRANSITION, không đổi gì',
      async (from, to) => {
        const { tx, run } = setup({ status: from });
        const e = await errorOf(run(to, 'ADMIN', 'x'));
        expect(e.status).toBe(409);
        expect(e.code).toBe('ORDER_INVALID_TRANSITION');
        expect(e.message).toContain('Không thể chuyển đơn từ');
        expect(tx.order.update).not.toHaveBeenCalled();
        expect(tx.$executeRaw).not.toHaveBeenCalled();
      },
    );

    it('khách không được xác nhận đơn', async () => {
      const { run } = setup();
      expect((await errorOf(run(OrderStatus.CONFIRMED, 'CUSTOMER'))).code).toBe(
        'ORDER_INVALID_TRANSITION',
      );
    });

    it('đơn không tồn tại → 404 ORDER_NOT_FOUND', async () => {
      const { run } = setup(null);
      const e = await errorOf(run(OrderStatus.CONFIRMED));
      expect(e.status).toBe(404);
      expect(e.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('đơn online (PENDING_PAYMENT)', () => {
    it('nhận chuyển khoản: PENDING_PAYMENT → PENDING đặt PAID, paidAt, paymentRef; không đụng tồn kho/voucher; ghi lịch sử', async () => {
      const { tx, run, calls } = setup({
        status: OrderStatus.PENDING_PAYMENT,
        paymentMethod: 'ONLINE',
      });
      await run(
        OrderStatus.PENDING,
        'SYSTEM',
        'Đã nhận chuyển khoản',
        null,
        '99001',
      );
      expect(tx.order.update.mock.calls[0][0].data).toEqual({
        status: OrderStatus.PENDING,
        paymentStatus: 'PAID',
        paidAt: NOW,
        paymentRef: '99001',
      });
      expect(calls).toEqual(['lock:order', 'order:update']);
      expect(tx.orderStatusHistory.create.mock.calls[0][0].data).toMatchObject({
        fromStatus: OrderStatus.PENDING_PAYMENT,
        toStatus: OrderStatus.PENDING,
        actorId: null,
        reason: 'Đã nhận chuyển khoản',
      });
    });

    it('ADMIN/STAFF/CUSTOMER không tự chuyển PENDING_PAYMENT → PENDING (409 ORDER_INVALID_TRANSITION)', async () => {
      for (const role of ['ADMIN', 'STAFF', 'CUSTOMER'] as const) {
        const { run } = setup({
          status: OrderStatus.PENDING_PAYMENT,
          paymentMethod: 'ONLINE',
        });
        expect(await errorOf(run(OrderStatus.PENDING, role))).toMatchObject({
          status: 409,
          code: 'ORDER_INVALID_TRANSITION',
        });
      }
    });

    it('hết hạn: SYSTEM (không có người) hủy PENDING_PAYMENT, nhả giữ chỗ và hoàn lượt voucher, lịch sử actorId null', async () => {
      const { tx, run, calls } = setup({
        status: OrderStatus.PENDING_PAYMENT,
        paymentMethod: 'ONLINE',
      });
      await run(OrderStatus.CANCELLED, 'SYSTEM', 'Hết hạn thanh toán', null);
      expect(calls).toEqual([
        'lock:order',
        'lock:variants',
        'variant:release',
        'variant:release',
        'voucher:release',
        'order:update',
      ]);
      expect(tx.orderStatusHistory.create.mock.calls[0][0].data).toMatchObject({
        toStatus: OrderStatus.CANCELLED,
        actorId: null,
        reason: 'Hết hạn thanh toán',
      });
    });

    it('khách hủy được đơn PENDING_PAYMENT chưa trả', async () => {
      const { run } = setup({
        status: OrderStatus.PENDING_PAYMENT,
        paymentMethod: 'ONLINE',
      });
      await expect(
        run(OrderStatus.CANCELLED, 'CUSTOMER', 'Đổi ý'),
      ).resolves.toBeUndefined();
    });

    it('khách KHÔNG hủy được đơn đã PAID (PENDING) → 409 ORDER_NOT_CANCELLABLE_BY_CUSTOMER, không ghi gì', async () => {
      const { tx, run } = setup({
        status: OrderStatus.PENDING,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
      });
      expect(
        await errorOf(run(OrderStatus.CANCELLED, 'CUSTOMER')),
      ).toMatchObject({
        status: 409,
        code: 'ORDER_NOT_CANCELLABLE_BY_CUSTOMER',
      });
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('STAFF không hủy được đơn đã PAID → 403 ORDER_PAID_ADMIN_ONLY, không ghi gì', async () => {
      const { tx, run } = setup({
        status: OrderStatus.PENDING,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
      });
      expect(
        await errorOf(run(OrderStatus.CANCELLED, 'STAFF', 'x')),
      ).toMatchObject({
        status: 403,
        code: 'ORDER_PAID_ADMIN_ONLY',
      });
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('ADMIN hủy được đơn đã PAID; paymentStatus giữ nguyên PAID (không đổi sang REFUNDED)', async () => {
      const { tx, run } = setup({
        status: OrderStatus.PENDING,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
      });
      await run(OrderStatus.CANCELLED, 'ADMIN', 'Khách yêu cầu hoàn tiền');
      const data = tx.order.update.mock.calls[0][0].data;
      expect(data.status).toBe(OrderStatus.CANCELLED);
      expect(data).not.toHaveProperty('paymentStatus');
    });

    it('SYSTEM không hủy được đơn PENDING (đã trả/COD) → 409', async () => {
      const { run } = setup({ status: OrderStatus.PENDING });
      expect(
        await errorOf(run(OrderStatus.CANCELLED, 'SYSTEM', 'x', null)),
      ).toMatchObject({ status: 409, code: 'ORDER_INVALID_TRANSITION' });
    });
  });
});
