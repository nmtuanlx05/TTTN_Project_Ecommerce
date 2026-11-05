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
  ) =>
    service.transition(tx as unknown as Prisma.TransactionClient, {
      orderId: 1,
      to,
      actor: { id: 42, role },
      reason,
      now: NOW,
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

    it.each([OrderStatus.PACKING, OrderStatus.SHIPPING])(
      'khách hủy đơn %s → ORDER_NOT_CANCELLABLE_BY_CUSTOMER',
      async (status) => {
        const { run } = setup({ status });
        expect(
          (await errorOf(run(OrderStatus.CANCELLED, 'CUSTOMER'))).code,
        ).toBe('ORDER_NOT_CANCELLABLE_BY_CUSTOMER');
      },
    );

    it.each([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKING])(
      'staff hủy đơn %s được',
      async (status) => {
        const { tx, run } = setup({ status });
        await run(OrderStatus.CANCELLED, 'STAFF', 'Khách đổi ý qua điện thoại');
        expect(tx.order.update).toHaveBeenCalled();
      },
    );

    it('không hủy được đơn đang giao hoặc đã giao (409)', async () => {
      for (const status of [OrderStatus.SHIPPING, OrderStatus.COMPLETED]) {
        const { tx, run } = setup({ status });
        const e = await errorOf(run(OrderStatus.CANCELLED, 'ADMIN', 'x'));
        expect(e.code).toBe('ORDER_INVALID_TRANSITION');
        expect(tx.$executeRaw).not.toHaveBeenCalled();
      }
    });

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

    it('CONFIRMED → PACKING không đổi kho', async () => {
      const { tx, inventory, run } = setup({ status: OrderStatus.CONFIRMED });
      await run(OrderStatus.PACKING, 'ADMIN');
      expect(inventory.shipOut).not.toHaveBeenCalled();
      expect(tx.order.update.mock.calls[0][0].data).toEqual({
        status: 'PACKING',
      });
    });

    it('PACKING → SHIPPING xuất kho từng biến thể theo id tăng dần, kèm người thao tác và mã đơn', async () => {
      const { tx, inventory, run } = setup({ status: OrderStatus.PACKING });
      await run(OrderStatus.SHIPPING, 'STAFF');
      expect(inventory.shipOut.mock.calls.map((c) => c.slice(1))).toEqual([
        [5, 2, 42, 'MS-261105-ABCD'],
        [8, 1, 42, 'MS-261105-ABCD'],
      ]);
      expect(inventory.shipOut.mock.calls[0][0]).toBe(tx);
    });

    it('xuất kho thất bại thì lỗi lan ra (cả transaction rollback), không đổi trạng thái', async () => {
      const { tx, inventory, run } = setup({ status: OrderStatus.PACKING });
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
      [OrderStatus.PENDING, OrderStatus.PACKING],
      [OrderStatus.PENDING, OrderStatus.SHIPPING],
      [OrderStatus.PENDING, OrderStatus.COMPLETED],
      [OrderStatus.CONFIRMED, OrderStatus.SHIPPING],
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
});
