import { toVnDateString } from '../common/utils/vn-date';
import { getVoucherStatus } from '../orders/vouchers.rules';
import type { VoucherStatus } from '../orders/vouchers.rules';
import type { DiscountType } from '../generated/prisma/enums';

// Trường đọc từ DB cho API quản trị (không chứa quan hệ)
export const voucherAdminSelect = {
  id: true,
  code: true,
  description: true,
  discountType: true,
  discountValue: true,
  maxDiscount: true,
  minOrderValue: true,
  usageLimit: true,
  usedCount: true,
  startsAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface VoucherAdminRow {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface VoucherAdminView extends VoucherAdminRow {
  // null nếu không giới hạn lượt dùng
  remainingUses: number | null;
  // Trạng thái suy ra, cùng quy tắc với phía khách
  status: VoucherStatus;
  // Ngày theo lịch Việt Nam (YYYY-MM-DD), dùng lại làm đầu vào khi sửa
  startsAtDate: string;
  expiresAtDate: string;
}

export function toAdminVoucher(
  row: VoucherAdminRow,
  now: Date,
): VoucherAdminView {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discountType,
    discountValue: row.discountValue,
    maxDiscount: row.maxDiscount,
    minOrderValue: row.minOrderValue,
    usageLimit: row.usageLimit,
    usedCount: row.usedCount,
    remainingUses:
      row.usageLimit === null
        ? null
        : Math.max(0, row.usageLimit - row.usedCount),
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    startsAtDate: toVnDateString(row.startsAt),
    expiresAtDate: toVnDateString(row.expiresAt),
    isActive: row.isActive,
    status: getVoucherStatus(row, now),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
