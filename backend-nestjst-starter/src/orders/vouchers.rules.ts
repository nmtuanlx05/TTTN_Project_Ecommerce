import { DiscountType } from '../generated/prisma/enums';
import { badRequest } from '../common/errors/coded-errors';
import { ORDER_ERROR } from './orders.constants';

// Quy tắc hiệu lực voucher (hàm thuần). `now` do caller truyền vào để cả kiểm tra lẫn câu UPDATE có điều kiện
// dùng cùng một mốc thời gian.

export interface VoucherRow {
  id: number;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// Chuẩn hóa mã: bỏ khoảng trắng hai đầu, chữ hoa. DB so khớp không phân biệt hoa thường (utf8mb4_unicode_ci).
export const normalizeVoucherCode = (code: string) => code.trim().toUpperCase();

export const formatVnd = (amount: number) =>
  `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

// Mỗi điều kiện một thông báo + mã lỗi riêng. Thứ tự: tắt, chưa đến hạn, hết hạn, đơn tối thiểu, hết lượt.
export function assertVoucherUsable(
  voucher: VoucherRow,
  subtotal: number,
  now: Date,
) {
  if (!voucher.isActive) {
    throw badRequest(ORDER_ERROR.VOUCHER_INACTIVE, 'Mã giảm giá đã bị tắt');
  }
  if (now < voucher.startsAt) {
    throw badRequest(
      ORDER_ERROR.VOUCHER_NOT_STARTED,
      'Mã giảm giá chưa đến thời gian áp dụng',
    );
  }
  if (now > voucher.expiresAt) {
    throw badRequest(ORDER_ERROR.VOUCHER_EXPIRED, 'Mã giảm giá đã hết hạn');
  }
  if (subtotal < voucher.minOrderValue) {
    throw badRequest(
      ORDER_ERROR.VOUCHER_MIN_ORDER,
      `Đơn hàng cần tối thiểu ${formatVnd(voucher.minOrderValue)} để dùng mã này`,
    );
  }
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    throw badRequest(
      ORDER_ERROR.VOUCHER_USAGE_LIMIT,
      'Mã giảm giá đã hết lượt sử dụng',
    );
  }
}

export const voucherNotFound = () =>
  badRequest(ORDER_ERROR.VOUCHER_NOT_FOUND, 'Mã giảm giá không tồn tại');
