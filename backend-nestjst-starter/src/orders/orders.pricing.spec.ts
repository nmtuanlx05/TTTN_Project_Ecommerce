import { DiscountType } from '../generated/prisma/enums';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from './orders.constants';
import {
  calculateDiscount,
  calculatePricing,
  calculateShippingFee,
} from './orders.pricing';

const percent = (discountValue: number, maxDiscount: number | null = null) => ({
  discountType: DiscountType.PERCENT,
  discountValue,
  maxDiscount,
});
const fixed = (discountValue: number) => ({
  discountType: DiscountType.FIXED,
  discountValue,
  maxDiscount: null,
});

describe('hằng số tiền', () => {
  it('khớp giá trị giao diện: ngưỡng 500.000, phí 30.000', () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(500_000);
    expect(SHIPPING_FEE).toBe(30_000);
  });
});

describe('phí vận chuyển (trên tạmTính trước giảm giá)', () => {
  it('499.999 → 30.000, tổng 529.999', () => {
    expect(calculateShippingFee(499_999)).toBe(30_000);
    expect(calculatePricing(499_999, null).totalAmount).toBe(529_999);
  });

  it('500.000 → miễn phí, tổng 500.000', () => {
    expect(calculateShippingFee(500_000)).toBe(0);
    expect(calculatePricing(500_000, null).totalAmount).toBe(500_000);
  });

  it('voucher làm tạmTính tụt dưới 500.000 vẫn miễn phí vận chuyển', () => {
    const result = calculatePricing(520_000, fixed(100_000));
    expect(result).toEqual({
      subtotal: 520_000,
      discountAmount: 100_000,
      shippingFee: 0,
      totalAmount: 420_000,
    });
  });

  it('tạmTính dưới ngưỡng sau giảm vẫn mất phí nếu tạmTính gốc dưới ngưỡng', () => {
    const result = calculatePricing(300_000, fixed(50_000));
    expect(result.shippingFee).toBe(30_000);
    expect(result.totalAmount).toBe(280_000);
  });
});

describe('giảm giá', () => {
  it('PERCENT không có maxDiscount: làm tròn xuống', () => {
    // 199.001 × 15 / 100 = 29.850,15 → 29.850
    expect(calculateDiscount(199_001, percent(15))).toBe(29_850);
    expect(calculatePricing(199_001, percent(15)).totalAmount).toBe(
      199_001 - 29_850 + 30_000,
    );
  });

  it('PERCENT làm tròn xuống ở ranh giới .99', () => {
    // 99 × 10 / 100 = 9,9 → 9
    expect(calculateDiscount(99, percent(10))).toBe(9);
  });

  it('PERCENT có maxDiscount: bị chặn ở trần', () => {
    expect(calculateDiscount(777_777, percent(10, 50_000))).toBe(50_000);
  });

  it('PERCENT có maxDiscount nhưng chưa chạm trần: lấy phần trăm', () => {
    expect(calculateDiscount(200_000, percent(10, 50_000))).toBe(20_000);
  });

  it('FIXED nhỏ hơn tạmTính: lấy đúng giá trị', () => {
    expect(calculateDiscount(300_000, fixed(50_000))).toBe(50_000);
  });

  it('FIXED lớn hơn tạmTính: bị chặn bằng tạmTính', () => {
    const result = calculatePricing(150_000, fixed(200_000));
    expect(result.discountAmount).toBe(150_000);
    expect(result.totalAmount).toBe(30_000);
  });

  it('maxDiscount không áp cho FIXED', () => {
    expect(
      calculateDiscount(300_000, {
        discountType: DiscountType.FIXED,
        discountValue: 80_000,
        maxDiscount: 10_000,
      }),
    ).toBe(80_000);
  });

  it('PERCENT 100% không vượt tạmTính', () => {
    expect(calculateDiscount(123_456, percent(100))).toBe(123_456);
  });

  it('tổng = 0 khi FIXED >= tạmTính và tạmTính >= 500.000 (đơn hợp lệ, miễn ship)', () => {
    const result = calculatePricing(500_000, fixed(600_000));
    expect(result).toEqual({
      subtotal: 500_000,
      discountAmount: 500_000,
      shippingFee: 0,
      totalAmount: 0,
    });
  });

  it('không dùng voucher: giảm giá bằng 0', () => {
    expect(calculatePricing(100_000, null).discountAmount).toBe(0);
  });
});
