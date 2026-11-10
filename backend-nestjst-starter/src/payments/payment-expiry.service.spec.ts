// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { OrderStatus } from '../generated/prisma/enums';
import { PaymentExpiryService } from './payment-expiry.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../inventory/inventory.service', () => ({
  InventoryService: class {},
}));

const NOW = new Date('2026-12-06T03:00:00.000Z');
const past = new Date(NOW.getTime() - 60_000);
const future = new Date(NOW.getTime() + 60_000);

interface Row {
  id: number;
  status: string;
  paymentStatus: string;
  paymentExpiresAt: Date | null;
}

function setup(rows: Row[]) {
  const log: string[] = [];
  const tx = {
    $queryRaw: jest.fn((sql: any) => {
      log.push(`lock:${sql.values[0]}`);
      const found = rows.find((r) => r.id === sql.values[0]);
      return Promise.resolve(found ? [{ ...found }] : []);
    }),
  };
  const prisma = {
    order: {
      findMany: jest.fn((args: any) =>
        Promise.resolve(
          rows
            .filter(
              (r) =>
                r.status === args.where.status &&
                r.paymentStatus === args.where.paymentStatus &&
                r.paymentExpiresAt !== null &&
                r.paymentExpiresAt <= args.where.paymentExpiresAt.lte,
            )
            .slice(0, args.take as number)
            .map((r) => ({ id: r.id })),
        ),
      ),
    },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const workflow = {
    transition: jest.fn((_tx: unknown, input: any) => {
      log.push(`cancel:${input.orderId}`);
      const row = rows.find((r) => r.id === input.orderId)!;
      row.status = OrderStatus.CANCELLED;
      return Promise.resolve();
    }),
  };
  const service = new PaymentExpiryService(prisma as never, workflow as never);
  return { service, prisma, workflow, rows, log };
}

const row = (over: Partial<Row>): Row => ({
  id: 1,
  status: OrderStatus.PENDING_PAYMENT,
  paymentStatus: 'UNPAID',
  paymentExpiresAt: past,
  ...over,
});

describe('PaymentExpiryService.expireOverdueOrders', () => {
  it('hủy đơn quá hạn bằng đường hủy có sẵn: actor SYSTEM, lý do "Hết hạn thanh toán"', async () => {
    const { service, workflow } = setup([row({ id: 1 })]);
    expect(await service.expireOverdueOrders(NOW)).toEqual({
      expired: 1,
      skipped: 0,
      failed: 0,
    });
    expect(workflow.transition.mock.calls[0][1]).toMatchObject({
      orderId: 1,
      to: OrderStatus.CANCELLED,
      actor: { id: null, role: 'SYSTEM' },
      reason: 'Hết hạn thanh toán',
    });
  });

  it('không đụng tới đơn còn hạn, đơn COD/đã xác nhận hoặc đã trả', async () => {
    const { service, workflow } = setup([
      row({ id: 1, paymentExpiresAt: future }),
      row({ id: 2, status: OrderStatus.PENDING, paymentExpiresAt: null }),
      row({ id: 3, status: OrderStatus.PENDING, paymentStatus: 'PAID' }),
    ]);
    expect(await service.expireOverdueOrders(NOW)).toEqual({
      expired: 0,
      skipped: 0,
      failed: 0,
    });
    expect(workflow.transition).not.toHaveBeenCalled();
  });

  it('đua với xác nhận: đơn vừa được thanh toán giữa lúc chọn và lúc khóa → kiểm lại sau khi khóa, bỏ qua, không hủy', async () => {
    const { service, workflow, rows } = setup([row({ id: 1 })]);
    // Ngay sau khi tác vụ chọn đơn, webhook xác nhận thanh toán
    const original = (service as any).prisma.order.findMany;
    (service as any).prisma.order.findMany = jest.fn(async (args: any) => {
      const result = await original(args);
      rows[0].status = OrderStatus.PENDING;
      rows[0].paymentStatus = 'PAID';
      return result;
    });
    expect(await service.expireOverdueOrders(NOW)).toEqual({
      expired: 0,
      skipped: 1,
      failed: 0,
    });
    expect(workflow.transition).not.toHaveBeenCalled();
  });

  it('idempotent: chạy lần hai không hủy lại', async () => {
    const { service, workflow } = setup([row({ id: 1 })]);
    await service.expireOverdueOrders(NOW);
    const second = await service.expireOverdueOrders(NOW);
    expect(second).toEqual({ expired: 0, skipped: 0, failed: 0 });
    expect(workflow.transition).toHaveBeenCalledTimes(1);
  });

  it('khóa từng đơn theo id tăng dần; một đơn lỗi không chặn các đơn còn lại', async () => {
    const { service, workflow, log } = setup([
      row({ id: 1 }),
      row({ id: 2 }),
      row({ id: 3 }),
    ]);
    workflow.transition.mockRejectedValueOnce(new Error('lỗi đơn 1'));
    expect(await service.expireOverdueOrders(NOW)).toEqual({
      expired: 2,
      skipped: 0,
      failed: 1,
    });
    expect(log.filter((l) => l.startsWith('lock:'))).toEqual([
      'lock:1',
      'lock:2',
      'lock:3',
    ]);
  });
});
