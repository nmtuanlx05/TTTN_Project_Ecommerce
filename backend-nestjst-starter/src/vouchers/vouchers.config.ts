import { badRequest, conflict } from '../common/errors/coded-errors';
import { DiscountType } from '../generated/prisma/enums';
import { VOUCHER_ADMIN_ERROR, VOUCHER_CODE_REGEX } from './vouchers.constants';

// Quy tắc cấu hình voucher (hàm thuần, không đụng DB). Chạy trên trạng thái SAU KHI gộp (tạo hoặc sửa);
// khi sửa chỉ kiểm phần liên quan tới trường thật sự thay đổi để voucher cũ (seed) vẫn sửa được mô tả.

export interface VoucherConfig {
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
}

export type VoucherField = keyof VoucherConfig;

// Khi đã có người dùng (usedCount > 0) các trường này bị khóa (docs/api/vouchers.md)
export const LOCKED_WHEN_USED: readonly VoucherField[] = [
  'code',
  'discountType',
  'discountValue',
  'maxDiscount',
  'startsAt',
];

const invalid = (field: string, message: string) =>
  badRequest(VOUCHER_ADMIN_ERROR.VOUCHER_INVALID_CONFIG, message, {
    errors: [{ field, message }],
  });

const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0;

export interface ValidateOptions {
  // Trường đã thay đổi (khi tạo: tất cả trường)
  changed: ReadonlySet<VoucherField>;
  // Chỉ khi tạo mới: expiresAt không được ở quá khứ (PATCH cho phép để kết thúc sớm)
  rejectPastExpiry?: Date;
}

export function validateVoucherConfig(
  cfg: VoucherConfig,
  { changed, rejectPastExpiry }: ValidateOptions,
) {
  if (changed.has('code') && !VOUCHER_CODE_REGEX.test(cfg.code)) {
    throw invalid(
      'code',
      'Mã voucher gồm 3 đến 30 ký tự: chữ A-Z, số 0-9, dấu gạch dưới hoặc gạch ngang',
    );
  }

  if (
    changed.has('discountType') ||
    changed.has('discountValue') ||
    changed.has('maxDiscount')
  ) {
    if (cfg.discountType === DiscountType.PERCENT) {
      if (
        !Number.isInteger(cfg.discountValue) ||
        cfg.discountValue < 1 ||
        cfg.discountValue > 100
      ) {
        throw invalid(
          'discountValue',
          'Voucher phần trăm phải giảm từ 1 đến 100',
        );
      }
      if (cfg.maxDiscount !== null && !isPositiveInt(cfg.maxDiscount)) {
        throw invalid('maxDiscount', 'Mức giảm tối đa phải lớn hơn 0');
      }
    } else {
      if (!isPositiveInt(cfg.discountValue)) {
        throw invalid('discountValue', 'Số tiền giảm phải lớn hơn 0');
      }
      if (cfg.maxDiscount !== null) {
        throw invalid(
          'maxDiscount',
          'Voucher giảm số tiền cố định không có mức giảm tối đa',
        );
      }
    }
  }

  if (
    changed.has('minOrderValue') &&
    (!Number.isInteger(cfg.minOrderValue) || cfg.minOrderValue < 0)
  ) {
    throw invalid('minOrderValue', 'Đơn tối thiểu không được âm');
  }

  if (changed.has('usageLimit') && cfg.usageLimit !== null) {
    if (!isPositiveInt(cfg.usageLimit)) {
      throw invalid(
        'usageLimit',
        'Giới hạn lượt dùng phải từ 1 trở lên, hoặc để trống nếu không giới hạn',
      );
    }
    if (cfg.usageLimit < cfg.usedCount) {
      throw badRequest(
        VOUCHER_ADMIN_ERROR.VOUCHER_USAGE_LIMIT_TOO_LOW,
        `Giới hạn lượt dùng không được thấp hơn số lượt đã dùng (${cfg.usedCount})`,
        {
          errors: [
            {
              field: 'usageLimit',
              message: `Tối thiểu ${cfg.usedCount} (số lượt đã dùng)`,
            },
          ],
        },
      );
    }
  }

  if (
    (changed.has('startsAt') || changed.has('expiresAt')) &&
    cfg.startsAt.getTime() >= cfg.expiresAt.getTime()
  ) {
    throw invalid('expiresAtDate', 'Ngày kết thúc phải sau ngày bắt đầu');
  }

  if (
    rejectPastExpiry &&
    cfg.expiresAt.getTime() < rejectPastExpiry.getTime()
  ) {
    throw invalid('expiresAtDate', 'Ngày kết thúc không được ở quá khứ');
  }
}

// Trường bị khóa mà yêu cầu có đổi → 409 VOUCHER_FIELD_LOCKED
export function assertNoLockedChange(
  usedCount: number,
  changed: ReadonlySet<VoucherField>,
) {
  if (usedCount <= 0) return;
  const locked = LOCKED_WHEN_USED.filter((f) => changed.has(f));
  if (locked.length === 0) return;
  const label = (f: VoucherField) => (f === 'startsAt' ? 'startsAtDate' : f);
  throw conflict(
    VOUCHER_ADMIN_ERROR.VOUCHER_FIELD_LOCKED,
    'Voucher đã có người dùng nên không thể đổi mã, loại giảm, giá trị giảm, mức giảm tối đa hoặc ngày bắt đầu. Hãy tắt voucher và tạo voucher mới.',
    {
      errors: locked.map((f) => ({
        field: label(f),
        message: 'Không được đổi khi voucher đã có người dùng',
      })),
    },
  );
}
