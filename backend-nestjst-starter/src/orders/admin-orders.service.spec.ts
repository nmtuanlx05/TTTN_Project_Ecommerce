// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { HttpException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import type { AuthUser } from '../auth/auth.types';
import { AdminOrdersService } from './admin-orders.service';
import type { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../inventory/inventory.service', () => ({
  InventoryService: class {},
}));

const user = (role: 'ADMIN' | 'STAFF'): AuthUser =>
  ({ id: role === 'ADMIN' ? 1 : 2, role }) as AuthUser;

function setup() {
  const tx = {};
  const prisma = {
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(tx) : Promise.all(arg as unknown[]),
    ),
    order: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  };
  const workflow = { transition: jest.fn().mockResolvedValue(undefined) };
  const service = new AdminOrdersService(prisma as never, workflow as never);
  prisma.order.findMany.mockResolvedValue([]);
  prisma.order.count.mockResolvedValue(0);
  return { service, prisma, workflow, tx };
}

const query = (
  over: Partial<QueryAdminOrdersDto> = {},
): QueryAdminOrdersDto => ({
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  order: 'desc',
  ...over,
});

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const ex = error as HttpException;
    return { status: ex.getStatus(), ...(ex.getResponse() as any) };
  }
  throw new Error('Kỳ vọng ném lỗi');
}

describe('AdminOrdersService.findAll', () => {
  it('phân trang: skip/take, mới nhất trước, danh sách và tổng cùng điều kiện lọc', async () => {
    const { service, prisma } = setup();
    prisma.order.count.mockResolvedValue(95);
    const result = await service.findAll(
      query({ page: 4, limit: 20, status: OrderStatus.CONFIRMED }),
    );

    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.skip).toBe(60);
    expect(args.take).toBe(20);
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.where).toEqual({ status: 'CONFIRMED' });
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { status: 'CONFIRMED' },
    });
    expect(result.meta).toEqual({
      page: 4,
      limit: 20,
      total: 95,
      totalPages: 5,
    });
  });

  it('khoảng ngày tính theo GMT+7: from từ 00:00, to đến hết ngày', async () => {
    const { service, prisma } = setup();
    await service.findAll(query({ from: '2026-11-05', to: '2026-11-06' }));
    const { createdAt } = prisma.order.findMany.mock.calls[0][0].where;
    expect(createdAt.gte.toISOString()).toBe('2026-11-04T17:00:00.000Z');
    expect(createdAt.lte.toISOString()).toBe('2026-11-06T16:59:59.999Z');
  });

  it('tìm theo mã đơn, số điện thoại hoặc tên người nhận', async () => {
    const { service, prisma } = setup();
    await service.findAll(query({ q: '0912' }));
    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({
      OR: [
        { code: { contains: '0912' } },
        { customerPhone: { contains: '0912' } },
        { customerName: { contains: '0912' } },
      ],
    });
  });

  it('kết hợp nhiều bộ lọc cùng lúc', async () => {
    const { service, prisma } = setup();
    await service.findAll(
      query({ status: OrderStatus.PENDING, from: '2026-11-01', q: 'MS-' }),
    );
    const where = prisma.order.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PENDING');
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.OR).toHaveLength(3);
  });

  it('sắp xếp theo tổng tiền tăng dần', async () => {
    const { service, prisma } = setup();
    await service.findAll(query({ sortBy: 'totalAmount', order: 'asc' }));
    expect(prisma.order.findMany.mock.calls[0][0].orderBy).toEqual([
      { totalAmount: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('ngày không có thật hoặc from sau to → 400', async () => {
    const { service } = setup();
    expect(
      (await errorOf(service.findAll(query({ from: '2026-02-31' })))).status,
    ).toBe(400);
    expect(
      await errorOf(
        service.findAll(query({ from: '2026-11-06', to: '2026-11-05' })),
      ),
    ).toMatchObject({
      status: 400,
      code: 'INVALID_DATE_RANGE',
    });
  });
});

describe('AdminOrdersService.findOne', () => {
  it('không có đơn → 404 ORDER_NOT_FOUND', async () => {
    const { service, prisma } = setup();
    prisma.order.findUnique.mockResolvedValue(null);
    expect(await errorOf(service.findOne(99))).toMatchObject({
      status: 404,
      code: 'ORDER_NOT_FOUND',
    });
  });
});

describe('AdminOrdersService.updateStatus', () => {
  const orderRow = {
    id: 5,
    items: [],
    statusHistories: [],
    user: null,
    handledBy: null,
  };

  it('hủy đơn mà thiếu lý do → 400 ORDER_CANCEL_REASON_REQUIRED, không gọi workflow', async () => {
    const { service, workflow } = setup();
    for (const reason of [undefined, null]) {
      expect(
        await errorOf(
          service.updateStatus(
            5,
            { status: OrderStatus.CANCELLED, reason },
            user('STAFF'),
          ),
        ),
      ).toMatchObject({ status: 400, code: 'ORDER_CANCEL_REASON_REQUIRED' });
    }
    expect(workflow.transition).not.toHaveBeenCalled();
  });

  it('hủy kèm lý do: gọi workflow với actor đúng vai trò', async () => {
    const { service, workflow, prisma, tx } = setup();
    prisma.order.findUnique.mockResolvedValue(orderRow);
    await service.updateStatus(
      5,
      { status: OrderStatus.CANCELLED, reason: 'Khách không nghe máy' },
      user('STAFF'),
    );
    expect(workflow.transition).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        orderId: 5,
        to: 'CANCELLED',
        actor: { id: 2, role: 'STAFF' },
        reason: 'Khách không nghe máy',
      }),
    );
  });

  it('ADMIN cũng đi qua workflow với role ADMIN; bước khác hủy không cần lý do', async () => {
    const { service, workflow, prisma } = setup();
    prisma.order.findUnique.mockResolvedValue(orderRow);
    await service.updateStatus(
      5,
      { status: OrderStatus.CONFIRMED },
      user('ADMIN'),
    );
    expect(workflow.transition.mock.calls[0][1]).toMatchObject({
      actor: { id: 1, role: 'ADMIN' },
      reason: null,
    });
  });

  it('lỗi chuyển trạng thái từ workflow được trả nguyên (409)', async () => {
    const { service, workflow } = setup();
    const err = new HttpException(
      { message: 'sai', code: 'ORDER_INVALID_TRANSITION' },
      409,
    );
    workflow.transition.mockRejectedValue(err);
    expect(
      await errorOf(
        service.updateStatus(
          5,
          { status: OrderStatus.SHIPPING },
          user('STAFF'),
        ),
      ),
    ).toMatchObject({
      status: 409,
      code: 'ORDER_INVALID_TRANSITION',
    });
  });
});
