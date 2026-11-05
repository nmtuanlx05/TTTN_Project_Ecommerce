import { HttpException } from '@nestjs/common';
import { DiscountType } from '../generated/prisma/enums';
import {
  assertVoucherUsable,
  formatVnd,
  normalizeVoucherCode,
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
