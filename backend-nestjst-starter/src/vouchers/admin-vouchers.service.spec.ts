// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { HttpException } from '@nestjs/common';
import { DiscountType } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { AdminVouchersService } from './admin-vouchers.service';
import { MAX_STATUS_FILTER_SCAN } from './vouchers.constants';
import type { CreateVoucherDto } from './dto/create-voucher.dto';
import type { QueryAdminVouchersDto } from './dto/query-admin-vouchers.dto';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const NOW = new Date('2026-12-06T03:00:00.000Z');

// Voucher seed "giờ lẻ": bắt đầu 01/11 00:00 VN, hết hạn 30/06/2027 23:59:59 VN (không có phần mili giây)
const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  code: 'SALE10',
  description: 'Giảm 10%',
  discountType: 'PERCENT',
  discountValue: 10,
  maxDiscount: 50_000,
  minOrderValue: 0,
  usageLimit: 1000,
  usedCount: 0,
  startsAt: new Date('2026-10-31T17:00:00.000Z'),
  expiresAt: new Date('2027-06-30T16:59:59.000Z'),
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

function errOf(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error('Kỳ vọng ném lỗi');
    },
    (e: HttpException) => ({
      status: e.getStatus(),
      ...(e.getResponse() as { code?: string }),
    }),
  );
}

function setup() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
    voucher: { findUnique: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(tx) : Promise.all(arg as unknown[]),
    ),
    voucher: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: { aggregate: jest.fn() },
  };
  return { service: new AdminVouchersService(prisma as never), prisma, tx };
}

const query = (
  over: Partial<QueryAdminVouchersDto> = {},
): QueryAdminVouchersDto => ({
  page: 1,
  limit: 10,
  sortBy: 'createdAt' as const,
  order: 'desc' as const,
  ...over,
});

const createDto = (over: Partial<CreateVoucherDto> = {}): CreateVoucherDto => ({
  code: ' zz-test10 ',
  discountType: DiscountType.PERCENT,
  discountValue: 10,
  startsAtDate: '2026-12-01',
  expiresAtDate: '2026-12-31',
  ...over,
});

describe('AdminVouchersService.findAll', () => {
  it('không có status: phân trang ở DB, kèm status suy ra và remainingUses', async () => {
    const { service, prisma } = setup();
    prisma.voucher.findMany.mockResolvedValue([
      row({ usedCount: 4, usageLimit: 5 }),
      row({ id: 2, usageLimit: null }),
    ]);
    prisma.voucher.count.mockResolvedValue(25);
    const res = await service.findAll(
      query({ page: 2, limit: 10, q: 'sale' }),
      NOW,
    );
    expect(prisma.voucher.findMany.mock.calls[0][0]).toMatchObject({
      where: { code: { contains: 'sale' } },
      skip: 10,
      take: 10,
    });
    expect(res.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    expect(res.data[0]).toMatchObject({
      status: 'ACTIVE',
      remainingUses: 1,
      startsAtDate: '2026-11-01',
      expiresAtDate: '2027-06-30',
    });
    expect(res.data[1].remainingUses).toBeNull();
  });

  it('có status: lọc trong bộ nhớ bằng getVoucherStatus, total theo kết quả lọc, có trần', async () => {
    const { service, prisma } = setup();
    prisma.voucher.findMany.mockResolvedValue([
      row({ id: 1 }),
      row({ id: 2, usageLimit: 3, usedCount: 3 }),
      row({ id: 3, isActive: false }),
      row({ id: 4, expiresAt: new Date('2026-12-01T00:00:00.000Z') }),
      row({ id: 5, startsAt: new Date('2027-01-01T00:00:00.000Z') }),
    ]);
    const get = async (status: QueryAdminVouchersDto['status']) =>
      (await service.findAll(query({ status }), NOW)).data.map((v) => v.id);
    expect(await get('ACTIVE')).toEqual([1]);
    expect(await get('EXHAUSTED')).toEqual([2]);
    expect(await get('INACTIVE')).toEqual([3]);
    expect(await get('EXPIRED')).toEqual([4]);
    expect(await get('SCHEDULED')).toEqual([5]);
    expect(prisma.voucher.findMany.mock.calls[0][0].take).toBe(
      MAX_STATUS_FILTER_SCAN,
    );
  });

  it('lọc status rồi phân trang trên kết quả đã lọc', async () => {
    const { service, prisma } = setup();
    prisma.voucher.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => row({ id: i + 1 })),
    );
    const res = await service.findAll(
      query({ status: 'ACTIVE', page: 2, limit: 2 }),
      NOW,
    );
    expect(res.data.map((v) => v.id)).toEqual([3, 4]);
    expect(res.meta).toMatchObject({ total: 5, totalPages: 3 });
  });
});

describe('AdminVouchersService.findOne', () => {
  it('kèm stats: đơn không tính CANCELLED và tổng tiền giảm', async () => {
    const { service, prisma } = setup();
    prisma.voucher.findUnique.mockResolvedValue(row({ usedCount: 3 }));
    prisma.order.aggregate.mockResolvedValue({
      _count: { _all: 3 },
      _sum: { discountAmount: 120_000 },
    });
    const res = await service.findOne(1, NOW);
    expect(prisma.order.aggregate.mock.calls[0][0].where).toEqual({
      voucherId: 1,
      status: { not: 'CANCELLED' },
    });
    expect(res.stats).toEqual({
      usedCount: 3,
      ordersCount: 3,
      totalDiscount: 120_000,
    });
  });

  it('chưa có đơn: tổng giảm = 0; không có voucher → 404 VOUCHER_NOT_FOUND', async () => {
    const { service, prisma } = setup();
    prisma.voucher.findUnique.mockResolvedValue(row());
    prisma.order.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { discountAmount: null },
    });
    expect((await service.findOne(1, NOW)).stats.totalDiscount).toBe(0);
    prisma.voucher.findUnique.mockResolvedValue(null);
    expect(await errOf(service.findOne(9, NOW))).toMatchObject({
      status: 404,
      code: 'VOUCHER_NOT_FOUND',
    });
  });
});

describe('AdminVouchersService.create', () => {
  it('chuẩn hóa mã HOA, ngày VN: đầu ngày bắt đầu, cuối ngày kết thúc', async () => {
    const { service, prisma } = setup();
    prisma.voucher.create.mockResolvedValue(row({ code: 'ZZ-TEST10' }));
    await service.create(createDto(), NOW);
    expect(prisma.voucher.create.mock.calls[0][0].data).toMatchObject({
      code: 'ZZ-TEST10',
      minOrderValue: 0,
      usageLimit: null,
      maxDiscount: null,
      startsAt: new Date('2026-11-30T17:00:00.000Z'),
      expiresAt: new Date('2026-12-31T16:59:59.999Z'),
    });
  });

  it('mã trùng (P2002) → 409 VOUCHER_CODE_EXISTS', async () => {
    const { service, prisma } = setup();
    prisma.voucher.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );
    expect(await errOf(service.create(createDto(), NOW))).toMatchObject({
      status: 409,
      code: 'VOUCHER_CODE_EXISTS',
    });
  });

  it.each([
    ['mã sai định dạng', { code: 'a b' }],
    ['PERCENT > 100', { discountValue: 101 }],
    [
      'ngày kết thúc đã qua',
      { expiresAtDate: '2026-12-05', startsAtDate: '2026-12-01' },
    ],
    [
      'kết thúc trước bắt đầu',
      { startsAtDate: '2026-12-20', expiresAtDate: '2026-12-10' },
    ],
  ])('%s → 400 VOUCHER_INVALID_CONFIG, không ghi DB', async (_n, over) => {
    const { service, prisma } = setup();
    expect(
      await errOf(service.create(createDto(over as never), NOW)),
    ).toMatchObject({
      status: 400,
      code: 'VOUCHER_INVALID_CONFIG',
    });
    expect(prisma.voucher.create).not.toHaveBeenCalled();
  });

  it('ngày không có thật → 400 INVALID_DATE', async () => {
    const { service } = setup();
    expect(
      await errOf(
        service.create(createDto({ expiresAtDate: '2026-02-31' }), NOW),
      ),
    ).toMatchObject({ status: 400, code: 'INVALID_DATE' });
  });
});

describe('AdminVouchersService.update', () => {
  it('khóa dòng voucher FOR UPDATE trong transaction trước khi ghi', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(row());
    tx.voucher.update.mockResolvedValue(row({ description: 'Mới' }));
    await service.update(1, { description: 'Mới' }, NOW);
    expect(String(tx.$queryRaw.mock.calls[0][0].sql)).toContain('FOR UPDATE');
  });

  it('voucher seed giờ lẻ: PATCH mô tả thành công, chỉ ghi đúng trường mô tả', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(
      row({ code: 'old code', usedCount: 7 }),
    );
    tx.voucher.update.mockResolvedValue(row());
    await service.update(1, { description: 'Mô tả mới' }, NOW);
    expect(tx.voucher.update.mock.calls[0][0].data).toEqual({
      description: 'Mô tả mới',
    });
  });

  it('gửi lại nguyên form (ngày VN trùng, giá trị trùng) khi đã dùng: không 409, không ghi, giữ mốc giờ', async () => {
    const { service, tx } = setup();
    const stored = row({ usedCount: 5 });
    tx.voucher.findUnique.mockResolvedValue(stored);
    const res = await service.update(
      1,
      {
        code: 'sale10',
        discountType: 'PERCENT',
        discountValue: 10,
        maxDiscount: 50_000,
        minOrderValue: 0,
        usageLimit: 1000,
        description: 'Giảm 10%',
        startsAtDate: '2026-11-01',
        expiresAtDate: '2027-06-30',
      } as never,
      NOW,
    );
    expect(tx.voucher.update).not.toHaveBeenCalled();
    expect(res.expiresAt).toEqual(stored.expiresAt);
  });

  it('đổi ngày kết thúc sang ngày khác → ghi cuối ngày VN mới; ngày bắt đầu không gửi giữ nguyên', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(row({ usedCount: 2 }));
    tx.voucher.update.mockResolvedValue(row());
    await service.update(1, { expiresAtDate: '2027-07-31' }, NOW);
    expect(tx.voucher.update.mock.calls[0][0].data).toEqual({
      expiresAt: new Date('2027-07-31T16:59:59.999Z'),
    });
  });

  it.each([
    ['code', { code: 'OTHER' }],
    ['discountType', { discountType: 'FIXED' }],
    ['discountValue', { discountValue: 20 }],
    ['maxDiscount', { maxDiscount: 60_000 }],
    ['startsAtDate', { startsAtDate: '2026-11-02' }],
  ])(
    'đã dùng, đổi %s → 409 VOUCHER_FIELD_LOCKED, không ghi',
    async (_f, dto) => {
      const { service, tx } = setup();
      tx.voucher.findUnique.mockResolvedValue(row({ usedCount: 1 }));
      expect(await errOf(service.update(1, dto as never, NOW))).toMatchObject({
        status: 409,
        code: 'VOUCHER_FIELD_LOCKED',
      });
      expect(tx.voucher.update).not.toHaveBeenCalled();
    },
  );

  it('chưa dùng: sửa được mọi trường kể cả code, loại giảm', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(row({ usedCount: 0 }));
    tx.voucher.update.mockResolvedValue(row());
    await service.update(
      1,
      {
        code: ' newcode ',
        discountType: 'FIXED',
        discountValue: 30_000,
        maxDiscount: null,
      } as never,
      NOW,
    );
    expect(tx.voucher.update.mock.calls[0][0].data).toEqual({
      code: 'NEWCODE',
      discountType: 'FIXED',
      discountValue: 30_000,
      maxDiscount: null,
    });
  });

  it('chưa dùng, PERCENT → FIXED mà còn maxDiscount → 400 VOUCHER_INVALID_CONFIG', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(row({ usedCount: 0 }));
    expect(
      await errOf(
        service.update(
          1,
          { discountType: 'FIXED', discountValue: 30_000 } as never,
          NOW,
        ),
      ),
    ).toMatchObject({ status: 400, code: 'VOUCHER_INVALID_CONFIG' });
  });

  it('usageLimit thấp hơn usedCount hiện có (đọc sau khóa) → 400 VOUCHER_USAGE_LIMIT_TOO_LOW; bằng thì được', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(row({ usedCount: 5 }));
    tx.voucher.update.mockResolvedValue(row());
    expect(
      await errOf(service.update(1, { usageLimit: 4 }, NOW)),
    ).toMatchObject({
      status: 400,
      code: 'VOUCHER_USAGE_LIMIT_TOO_LOW',
    });
    await service.update(1, { usageLimit: 5 }, NOW);
    expect(tx.voucher.update).toHaveBeenCalledTimes(1);
  });

  it('PATCH cho phép expiresAt ở quá khứ (kết thúc sớm) nhưng phải sau startsAt', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(
      row({ startsAt: new Date('2026-11-30T17:00:00.000Z') }),
    );
    tx.voucher.update.mockResolvedValue(row());
    await service.update(1, { expiresAtDate: '2026-12-02' }, NOW);
    expect(tx.voucher.update).toHaveBeenCalledTimes(1);
    expect(
      await errOf(service.update(1, { expiresAtDate: '2026-11-30' }, NOW)),
    ).toMatchObject({ status: 400, code: 'VOUCHER_INVALID_CONFIG' });
  });

  it('đổi code sang mã đã có (P2002) → 409 VOUCHER_CODE_EXISTS', async () => {
    const { service, tx } = setup();
    tx.voucher.findUnique.mockResolvedValue(row());
    tx.voucher.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );
    expect(await errOf(service.update(1, { code: 'KHAC' }, NOW))).toMatchObject(
      {
        status: 409,
        code: 'VOUCHER_CODE_EXISTS',
      },
    );
  });

  it('không tồn tại → 404 VOUCHER_NOT_FOUND', async () => {
    const { service, tx } = setup();
    tx.$queryRaw.mockResolvedValue([]);
    expect(
      await errOf(service.update(9, { description: 'x' }, NOW)),
    ).toMatchObject({ status: 404, code: 'VOUCHER_NOT_FOUND' });
  });
});

describe('AdminVouchersService.updateStatus', () => {
  it('bật/tắt và trả status suy ra mới', async () => {
    const { service, prisma } = setup();
    prisma.voucher.update.mockResolvedValue(row({ isActive: false }));
    const res = await service.updateStatus(1, { isActive: false }, NOW);
    expect(prisma.voucher.update.mock.calls[0][0].data).toEqual({
      isActive: false,
    });
    expect(res.status).toBe('INACTIVE');
  });

  it('không tồn tại (P2025) → 404 VOUCHER_NOT_FOUND', async () => {
    const { service, prisma } = setup();
    prisma.voucher.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('nf', {
        code: 'P2025',
        clientVersion: 'x',
      }),
    );
    expect(
      await errOf(service.updateStatus(9, { isActive: true }, NOW)),
    ).toMatchObject({ status: 404, code: 'VOUCHER_NOT_FOUND' });
  });
});
