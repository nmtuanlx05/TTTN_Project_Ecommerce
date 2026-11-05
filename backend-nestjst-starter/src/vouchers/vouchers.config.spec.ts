import { HttpException } from '@nestjs/common';
import { DiscountType } from '../generated/prisma/enums';
import { assertNoLockedChange, validateVoucherConfig } from './vouchers.config';
import type { VoucherConfig, VoucherField } from './vouchers.config';

const NOW = new Date('2026-12-06T03:00:00.000Z');

const cfg = (over: Partial<VoucherConfig> = {}): VoucherConfig => ({
  code: 'SALE10',
  description: null,
  discountType: DiscountType.PERCENT,
  discountValue: 10,
  maxDiscount: null,
  minOrderValue: 0,
  usageLimit: null,
  usedCount: 0,
  startsAt: new Date('2026-12-01T00:00:00.000Z'),
  expiresAt: new Date('2027-01-31T00:00:00.000Z'),
  ...over,
});
const all = new Set<VoucherField>([
  'code',
  'description',
  'discountType',
  'discountValue',
  'maxDiscount',
  'minOrderValue',
  'usageLimit',
  'usedCount',
  'startsAt',
  'expiresAt',
]);
const only = (...f: VoucherField[]) => new Set<VoucherField>(f);

function errOf(fn: () => void) {
  try {
    fn();
  } catch (e) {
    const ex = e as HttpException;
    return {
      status: ex.getStatus(),
      ...(ex.getResponse() as { code: string }),
    };
  }
  return null;
}
const create = (over: Partial<VoucherConfig>) =>
  errOf(() =>
    validateVoucherConfig(cfg(over), { changed: all, rejectPastExpiry: NOW }),
  );

describe('validateVoucherConfig (tạo mới)', () => {
  it('cấu hình hợp lệ → không lỗi', () => {
    expect(create({})).toBeNull();
    expect(
      create({ discountType: DiscountType.FIXED, discountValue: 50_000 }),
    ).toBeNull();
  });

  it.each(['ab', 'a'.repeat(31), 'SALE 10', 'SALE.10', 'GIẢM10', 'sale10'])(
    'mã "%s" sai định dạng → 400 VOUCHER_INVALID_CONFIG',
    (code) => {
      expect(create({ code })).toMatchObject({
        status: 400,
        code: 'VOUCHER_INVALID_CONFIG',
      });
    },
  );

  it.each(['ABC', 'A_B-9', 'A'.repeat(30)])('mã "%s" hợp lệ', (code) => {
    expect(create({ code })).toBeNull();
  });

  it.each([0, 101, -5, 10.5])(
    'PERCENT với giá trị %s → 400',
    (discountValue) => {
      expect(create({ discountValue })).toMatchObject({
        code: 'VOUCHER_INVALID_CONFIG',
      });
    },
  );

  it('PERCENT biên 1 và 100 hợp lệ; maxDiscount phải > 0', () => {
    expect(create({ discountValue: 1 })).toBeNull();
    expect(create({ discountValue: 100 })).toBeNull();
    expect(create({ maxDiscount: 0 })).toMatchObject({
      code: 'VOUCHER_INVALID_CONFIG',
    });
    expect(create({ maxDiscount: 1 })).toBeNull();
  });

  it('FIXED: giá trị > 0 và không có maxDiscount', () => {
    const fixed = { discountType: DiscountType.FIXED };
    expect(create({ ...fixed, discountValue: 0 })).toMatchObject({
      code: 'VOUCHER_INVALID_CONFIG',
    });
    expect(
      create({ ...fixed, discountValue: 5000, maxDiscount: 1000 }),
    ).toMatchObject({ code: 'VOUCHER_INVALID_CONFIG' });
    expect(create({ ...fixed, discountValue: 500_000 })).toBeNull();
  });

  it('minOrderValue âm → 400', () => {
    expect(create({ minOrderValue: -1 })).toMatchObject({
      code: 'VOUCHER_INVALID_CONFIG',
    });
    expect(create({ minOrderValue: 0 })).toBeNull();
  });

  it('usageLimit: null hoặc >= 1', () => {
    expect(create({ usageLimit: 0 })).toMatchObject({
      code: 'VOUCHER_INVALID_CONFIG',
    });
    expect(create({ usageLimit: 1 })).toBeNull();
    expect(create({ usageLimit: null })).toBeNull();
  });

  it('startsAt >= expiresAt → 400', () => {
    const d = new Date('2027-01-01T00:00:00.000Z');
    expect(create({ startsAt: d, expiresAt: d })).toMatchObject({
      code: 'VOUCHER_INVALID_CONFIG',
    });
  });

  it('expiresAt đã qua khi tạo → 400; đúng bằng bây giờ thì chấp nhận', () => {
    const past = new Date('2026-12-06T02:59:59.999Z');
    expect(
      create({
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: past,
      }),
    ).toMatchObject({ code: 'VOUCHER_INVALID_CONFIG' });
    expect(
      create({
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: NOW,
      }),
    ).toBeNull();
  });
});

describe('validateVoucherConfig (sửa: chỉ kiểm phần thay đổi)', () => {
  it('voucher cũ có mã/ngày "lệch chuẩn" vẫn sửa được mô tả', () => {
    const legacy = cfg({
      code: 'old code',
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      startsAt: new Date('2019-01-01T00:00:00.000Z'),
    });
    expect(
      errOf(() =>
        validateVoucherConfig(legacy, { changed: only('description') }),
      ),
    ).toBeNull();
  });

  it('expiresAt ở quá khứ được phép khi sửa (kết thúc sớm) nhưng vẫn phải sau startsAt', () => {
    const next = cfg({ expiresAt: new Date('2026-12-02T00:00:00.000Z') });
    expect(
      errOf(() => validateVoucherConfig(next, { changed: only('expiresAt') })),
    ).toBeNull();
    const bad = cfg({ expiresAt: new Date('2026-11-30T00:00:00.000Z') });
    expect(
      errOf(() => validateVoucherConfig(bad, { changed: only('expiresAt') })),
    ).toMatchObject({ code: 'VOUCHER_INVALID_CONFIG' });
  });

  it('đổi PERCENT → FIXED mà còn maxDiscount → 400 VOUCHER_INVALID_CONFIG', () => {
    const next = cfg({
      discountType: DiscountType.FIXED,
      discountValue: 50_000,
      maxDiscount: 50_000,
    });
    expect(
      errOf(() =>
        validateVoucherConfig(next, { changed: only('discountType') }),
      ),
    ).toMatchObject({ status: 400, code: 'VOUCHER_INVALID_CONFIG' });
  });

  it('usageLimit thấp hơn usedCount → 400 VOUCHER_USAGE_LIMIT_TOO_LOW; bằng usedCount thì được', () => {
    const run = (usageLimit: number) =>
      errOf(() =>
        validateVoucherConfig(cfg({ usedCount: 5, usageLimit }), {
          changed: only('usageLimit'),
        }),
      );
    expect(run(4)).toMatchObject({
      status: 400,
      code: 'VOUCHER_USAGE_LIMIT_TOO_LOW',
    });
    expect(run(5)).toBeNull();
  });
});

describe('assertNoLockedChange', () => {
  it('chưa ai dùng → không khóa gì', () => {
    expect(
      errOf(() =>
        assertNoLockedChange(0, only('code', 'discountValue', 'startsAt')),
      ),
    ).toBeNull();
  });

  it.each<VoucherField>([
    'code',
    'discountType',
    'discountValue',
    'maxDiscount',
    'startsAt',
  ])('đã dùng, đổi %s → 409 VOUCHER_FIELD_LOCKED', (field) => {
    expect(errOf(() => assertNoLockedChange(1, only(field)))).toMatchObject({
      status: 409,
      code: 'VOUCHER_FIELD_LOCKED',
    });
  });

  it('đã dùng, đổi trường được phép → không lỗi', () => {
    expect(
      errOf(() =>
        assertNoLockedChange(
          3,
          only('description', 'expiresAt', 'usageLimit', 'minOrderValue'),
        ),
      ),
    ).toBeNull();
  });
});
