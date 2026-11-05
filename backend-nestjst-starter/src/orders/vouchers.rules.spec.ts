import { HttpException } from '@nestjs/common';
import { DiscountType } from '../generated/prisma/enums';
import {
  assertVoucherUsable,
  formatVnd,
  getVoucherStatus,
  normalizeVoucherCode,
  VOUCHER_STATUSES,
} from './vouchers.rules';
import type { VoucherRow } from './vouchers.rules';

const NOW = new Date('2026-12-06T03:00:00.000Z');

const voucher = (over: Partial<VoucherRow> = {}): VoucherRow => ({
  id: 1,
  code: 'SALE10',
  description: null,
  discountType: DiscountType.PERCENT,
  discountValue: 10,
  maxDiscount: null,
  minOrderValue: 300_000,
  usageLimit: 100,
  usedCount: 0,
  startsAt: new Date('2026-11-01T00:00:00.000Z'),
  expiresAt: new Date('2027-01-31T00:00:00.000Z'),
  isActive: true,
  ...over,
});

function errorOf(fn: () => void) {
  try {
    fn();
  } catch (error) {
    const ex = error as HttpException;
    return {
      status: ex.getStatus(),
      body: ex.getResponse() as { message: string; code: string },
    };
  }
  throw new Error('Kỳ vọng ném lỗi nhưng không có');
}

describe('normalizeVoucherCode', () => {
  it('trim và chữ hoa', () => {
    expect(normalizeVoucherCode('  sale10 ')).toBe('SALE10');
    expect(normalizeVoucherCode('Sale10')).toBe('SALE10');
  });
});

describe('formatVnd', () => {
  it('ngăn cách hàng nghìn bằng dấu chấm', () => {
    expect(formatVnd(300_000)).toBe('300.000đ');
    expect(formatVnd(1_250_000)).toBe('1.250.000đ');
    expect(formatVnd(0)).toBe('0đ');
  });
});

describe('assertVoucherUsable', () => {
  it('hợp lệ thì không ném lỗi', () => {
    expect(() => assertVoucherUsable(voucher(), 400_000, NOW)).not.toThrow();
  });

  it('đã tắt → VOUCHER_INACTIVE (400)', () => {
    const e = errorOf(() =>
      assertVoucherUsable(voucher({ isActive: false }), 400_000, NOW),
    );
    expect(e.status).toBe(400);
    expect(e.body.code).toBe('VOUCHER_INACTIVE');
    expect(e.body.message).toBe('Mã giảm giá đã bị tắt');
  });

  it('chưa đến hạn → VOUCHER_NOT_STARTED', () => {
    const e = errorOf(() =>
      assertVoucherUsable(
        voucher({ startsAt: new Date(NOW.getTime() + 1) }),
        400_000,
        NOW,
      ),
    );
    expect(e.body.code).toBe('VOUCHER_NOT_STARTED');
  });

  it('đúng thời điểm startsAt thì hợp lệ (now < startsAt mới lỗi)', () => {
    expect(() =>
      assertVoucherUsable(voucher({ startsAt: NOW }), 400_000, NOW),
    ).not.toThrow();
  });

  it('hết hạn → VOUCHER_EXPIRED', () => {
    const e = errorOf(() =>
      assertVoucherUsable(
        voucher({ expiresAt: new Date(NOW.getTime() - 1) }),
        400_000,
        NOW,
      ),
    );
    expect(e.body.code).toBe('VOUCHER_EXPIRED');
    expect(e.body.message).toBe('Mã giảm giá đã hết hạn');
  });

  it('đúng thời điểm expiresAt thì còn hợp lệ (now > expiresAt mới lỗi)', () => {
    expect(() =>
      assertVoucherUsable(voucher({ expiresAt: NOW }), 400_000, NOW),
    ).not.toThrow();
  });

  it('minOrderValue: 299.999 lỗi, 300.000 hợp lệ; thông báo nêu số tiền', () => {
    const e = errorOf(() => assertVoucherUsable(voucher(), 299_999, NOW));
    expect(e.body.code).toBe('VOUCHER_MIN_ORDER');
    expect(e.body.message).toBe(
      'Đơn hàng cần tối thiểu 300.000đ để dùng mã này',
    );
    expect(() => assertVoucherUsable(voucher(), 300_000, NOW)).not.toThrow();
  });

  it('hết lượt: usedCount >= usageLimit → VOUCHER_USAGE_LIMIT', () => {
    const e = errorOf(() =>
      assertVoucherUsable(
        voucher({ usageLimit: 5, usedCount: 5 }),
        400_000,
        NOW,
      ),
    );
    expect(e.body.code).toBe('VOUCHER_USAGE_LIMIT');
    expect(e.body.message).toBe('Mã giảm giá đã hết lượt sử dụng');
  });

  it('còn đúng một lượt thì hợp lệ; usageLimit null là không giới hạn', () => {
    expect(() =>
      assertVoucherUsable(
        voucher({ usageLimit: 5, usedCount: 4 }),
        400_000,
        NOW,
      ),
    ).not.toThrow();
    expect(() =>
      assertVoucherUsable(
        voucher({ usageLimit: null, usedCount: 9999 }),
        400_000,
        NOW,
      ),
    ).not.toThrow();
  });
});

describe('assertVoucherUsable: thứ tự giữ nguyên sau refactor', () => {
  const codeOf = (v: VoucherRow, subtotal: number) =>
    errorOf(() => assertVoucherUsable(v, subtotal, NOW)).body.code;

  it('vừa hết lượt vừa chưa đủ đơn tối thiểu → VOUCHER_MIN_ORDER', () => {
    const v = voucher({ usageLimit: 5, usedCount: 5, minOrderValue: 300_000 });
    expect(codeOf(v, 100_000)).toBe('VOUCHER_MIN_ORDER');
  });

  it('đủ đơn tối thiểu mà hết lượt → VOUCHER_USAGE_LIMIT', () => {
    const v = voucher({ usageLimit: 5, usedCount: 5 });
    expect(codeOf(v, 400_000)).toBe('VOUCHER_USAGE_LIMIT');
  });

  it('tắt ưu tiên hơn chưa đến hạn, hết hạn, hết lượt', () => {
    const v = voucher({
      isActive: false,
      startsAt: new Date('2027-01-01T00:00:00.000Z'),
      usageLimit: 1,
      usedCount: 1,
    });
    expect(codeOf(v, 0)).toBe('VOUCHER_INACTIVE');
  });

  it('hết hạn ưu tiên hơn đơn tối thiểu và hết lượt', () => {
    const v = voucher({
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
      usageLimit: 1,
      usedCount: 1,
    });
    expect(codeOf(v, 0)).toBe('VOUCHER_EXPIRED');
  });
});

describe('getVoucherStatus', () => {
  const at = (iso: string) => new Date(iso);
  const status = (over: Partial<VoucherRow>, now: Date = NOW) =>
    getVoucherStatus(voucher(over), now);

  it('đủ điều kiện → ACTIVE; liệt kê đủ 5 trạng thái', () => {
    expect(status({})).toBe('ACTIVE');
    expect(VOUCHER_STATUSES).toHaveLength(5);
  });

  it('biên startsAt: trước 1ms là SCHEDULED, đúng mốc là ACTIVE', () => {
    const startsAt = at('2026-12-06T03:00:00.000Z');
    expect(status({ startsAt }, at('2026-12-06T02:59:59.999Z'))).toBe(
      'SCHEDULED',
    );
    expect(status({ startsAt }, startsAt)).toBe('ACTIVE');
  });

  it('biên expiresAt: đúng mốc là ACTIVE, sau 1ms là EXPIRED', () => {
    const expiresAt = at('2026-12-06T03:00:00.000Z');
    expect(status({ expiresAt }, expiresAt)).toBe('ACTIVE');
    expect(status({ expiresAt }, at('2026-12-06T03:00:00.001Z'))).toBe(
      'EXPIRED',
    );
  });

  it('biên lượt dùng: usedCount = usageLimit - 1 còn ACTIVE, = usageLimit là EXHAUSTED', () => {
    expect(status({ usageLimit: 5, usedCount: 4 })).toBe('ACTIVE');
    expect(status({ usageLimit: 5, usedCount: 5 })).toBe('EXHAUSTED');
    expect(status({ usageLimit: null, usedCount: 999_999 })).toBe('ACTIVE');
  });

  it('thứ tự ưu tiên khi nhiều điều kiện cùng đúng', () => {
    const past = at('2026-01-01T00:00:00.000Z');
    const future = at('2030-01-01T00:00:00.000Z');
    // tắt thắng tất cả
    expect(status({ isActive: false, startsAt: future, expiresAt: past })).toBe(
      'INACTIVE',
    );
    // hết hạn thắng hết lượt
    expect(
      status({ expiresAt: past, startsAt: past, usageLimit: 1, usedCount: 1 }),
    ).toBe('EXPIRED');
    // chưa đến hạn thắng hết lượt
    expect(
      status({
        startsAt: future,
        expiresAt: future,
        usageLimit: 1,
        usedCount: 1,
      }),
    ).toBe('SCHEDULED');
  });
});
