import { DiscountType } from '../generated/prisma/enums';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from './orders.constants';

// Nơi DUY NHẤT tính tiền đơn hàng (số nguyên VND). Preview và đặt đơn cùng gọi calculatePricing.

export interface DiscountRule {
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
}

// PERCENT: floor(tạmTính × % / 100) rồi không vượt maxDiscount; FIXED: discountValue.
// Cả hai bị chặn <= tạmTính để tổng tiền hàng không bao giờ âm. Làm tròn xuống.
export function calculateDiscount(
  subtotal: number,
  rule: DiscountRule,
): number {
  let discount =
    rule.discountType === DiscountType.PERCENT
      ? Math.floor((subtotal * rule.discountValue) / 100)
      : rule.discountValue;
  if (rule.discountType === DiscountType.PERCENT && rule.maxDiscount !== null) {
    discount = Math.min(discount, rule.maxDiscount);
  }
  return Math.max(0, Math.min(discount, subtotal));
}

// Ngưỡng miễn phí vận chuyển tính trên tạmTính TRƯỚC giảm giá
export const calculateShippingFee = (subtotal: number) =>
  subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

export interface Pricing {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
}

export function calculatePricing(
  subtotal: number,
  voucher: DiscountRule | null,
): Pricing {
  const discountAmount = voucher ? calculateDiscount(subtotal, voucher) : 0;
  const shippingFee = calculateShippingFee(subtotal);
  return {
    subtotal,
    discountAmount,
    shippingFee,
    totalAmount: subtotal - discountAmount + shippingFee,
  };
}
