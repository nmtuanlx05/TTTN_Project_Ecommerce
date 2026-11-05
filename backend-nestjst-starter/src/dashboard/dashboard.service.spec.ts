// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { HttpException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

function setup() {
  const prisma = {
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    $queryRaw: jest.fn(),
    order: { groupBy: jest.fn(), findMany: jest.fn() },
  };
  // Thứ tự gọi $queryRaw: doanh thu, đơn theo ngày, khách mới, top sản phẩm, sắp hết, tổng sắp hết
  prisma.$queryRaw
    .mockResolvedValueOnce([
      { d: '2026-11-05', revenue: BigInt(847000), completed: BigInt(1) },
    ])
    .mockResolvedValueOnce([{ d: '2026-11-05', n: BigInt(3) }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ total: BigInt(26) }]);
  prisma.order.groupBy.mockResolvedValue([
    { status: 'PENDING', _count: { _all: 1 } },
    { status: 'COMPLETED', _count: { _all: 1 } },
    { status: 'CANCELLED', _count: { _all: 1 } },
  ]);
  prisma.order.findMany.mockResolvedValue([]);
  return { service: new DashboardService(prisma as never), prisma };
}

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const ex = error as HttpException;
    return {
      status: ex.getStatus(),
      ...(ex.getResponse() as Record<string, unknown>),
    };
  }
  throw new Error('Kỳ vọng ném lỗi');
}

describe('DashboardService.getDashboard', () => {
  it('gom mọi truy vấn trong đúng một $transaction và dựng kết quả khớp nhau', async () => {
    const { service, prisma } = setup();
    const r = await service.getDashboard({
      from: '2026-11-05',
      to: '2026-11-05',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(8);

    expect(r.current.revenue).toBe(847000);
    expect(r.current.orderCount).toBe(3);
    expect(r.current.averageOrderValue).toBe(847000);
    // Tổng statusCounts = số đơn của kỳ
    expect(r.statusCounts.reduce((s, x) => s + x.count, 0)).toBe(
      r.current.orderCount,
    );
    expect(r.lowStockVariants.total).toBe(26);
  });

  it('statusCounts lọc đúng [gte, lt) UTC của kỳ hiện tại', async () => {
    const { service, prisma } = setup();
    await service.getDashboard({ from: '2026-11-05', to: '2026-11-05' });
    const where = prisma.order.groupBy.mock.calls[0][0].where;
    expect(where.createdAt.gte.toISOString()).toBe('2026-11-04T17:00:00.000Z');
    expect(where.createdAt.lt.toISOString()).toBe('2026-11-05T17:00:00.000Z');
  });

  it('đơn cần xử lý: PENDING và CONFIRMED, mới nhất trước, tối đa 6', async () => {
    const { service, prisma } = setup();
    await service.getDashboard({ from: '2026-11-05', to: '2026-11-05' });
    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.where.status.in).toEqual(['PENDING', 'CONFIRMED']);
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.take).toBe(6);
  });

  it('khoảng ngày sai → 400 và không chạm DB', async () => {
    const { service, prisma } = setup();
    expect(
      await errorOf(
        service.getDashboard({ from: '2026-11-06', to: '2026-11-05' }),
      ),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE_RANGE' });
    expect(
      await errorOf(
        service.getDashboard({ from: '2026-02-31', to: '2026-03-01' }),
      ),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
