// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MAX_AVAILABLE_VOUCHERS, VouchersService } from './vouchers.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

// Prisma giả: không chạy SQL thật nên điều kiện lọc chỉ được kiểm ở mức câu SQL và tham số;
// việc lọc thật trên MySQL cần chạy thử tay.
describe('VouchersService.findAvailable', () => {
  const NOW = new Date('2026-12-06T03:00:00.000Z');
  const prisma = { $queryRaw: jest.fn() };
  const service = new VouchersService(prisma as never);
  const sqlCall = () =>
    prisma.$queryRaw.mock.calls[0][0] as { sql: string; values: unknown[] };

  beforeEach(() => jest.resetAllMocks());

  it('SQL lọc đúng điều kiện: bật, trong [startsAt, expiresAt], còn lượt; sắp expiresAt rồi code; tối đa 20', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await service.findAvailable(NOW);

    const { sql, values } = sqlCall();
    expect(sql).toContain('isActive = 1');
    expect(sql).toContain('startsAt <= ?');
    expect(sql).toContain('expiresAt >= ?');
    expect(sql).toContain('usageLimit IS NULL OR usedCount < usageLimit');
    expect(sql).toContain('ORDER BY expiresAt ASC, code ASC');
    expect(sql).toContain('LIMIT ?');
    // Một mốc now dùng cho cả hai điều kiện; giới hạn là tham số, không ghép chuỗi
    expect(values).toEqual([NOW, NOW, MAX_AVAILABLE_VOUCHERS]);
    expect(MAX_AVAILABLE_VOUCHERS).toBe(20);
  });

  it('không chọn id, usageLimit, usedCount trong SQL', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await service.findAvailable(NOW);
    const select = sqlCall().sql.split('FROM')[0];
    expect(select).not.toMatch(/\bid\b|usageLimit|usedCount/);
  });

  it('chỉ trả đúng 7 trường, kể cả khi dòng DB có thêm cột nội bộ', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 9,
        code: 'SALE10',
        description: 'Giảm 10%',
        discountType: 'PERCENT',
        discountValue: 10,
        maxDiscount: 50000,
        minOrderValue: 0,
        usageLimit: 100,
        usedCount: 3,
        expiresAt: new Date('2027-06-30T16:59:59.000Z'),
      },
    ]);
    const [item] = await service.findAvailable(NOW);
    expect(Object.keys(item).sort()).toEqual([
      'code',
      'description',
      'discountType',
      'discountValue',
      'expiresAt',
      'maxDiscount',
      'minOrderValue',
    ]);
    expect(JSON.stringify(item)).not.toMatch(/usageLimit|usedCount|"id"/);
  });

  it('giữ thứ tự DB trả về và chuẩn hóa số (maxDiscount null giữ null)', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        code: 'A',
        description: null,
        discountType: 'FIXED',
        discountValue: '50000',
        maxDiscount: null,
        minOrderValue: '400000',
        expiresAt: new Date('2027-01-01'),
      },
      {
        code: 'B',
        description: null,
        discountType: 'PERCENT',
        discountValue: 10,
        maxDiscount: 100000,
        minOrderValue: 0,
        expiresAt: new Date('2027-02-01'),
      },
    ]);
    const result = await service.findAvailable(NOW);
    expect(result.map((v) => v.code)).toEqual(['A', 'B']);
    expect(result[0]).toMatchObject({
      discountValue: 50000,
      maxDiscount: null,
      minOrderValue: 400000,
    });
  });
});
