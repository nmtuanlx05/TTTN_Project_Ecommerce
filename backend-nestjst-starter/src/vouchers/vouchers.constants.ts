// Mã lỗi máy đọc được của API quản trị voucher (trường `code` của response lỗi), liệt kê ở docs/api/vouchers.md
export const VOUCHER_ADMIN_ERROR = {
  VOUCHER_NOT_FOUND: 'VOUCHER_NOT_FOUND',
  VOUCHER_CODE_EXISTS: 'VOUCHER_CODE_EXISTS',
  VOUCHER_INVALID_CONFIG: 'VOUCHER_INVALID_CONFIG',
  VOUCHER_USAGE_LIMIT_TOO_LOW: 'VOUCHER_USAGE_LIMIT_TOO_LOW',
  VOUCHER_FIELD_LOCKED: 'VOUCHER_FIELD_LOCKED',
} as const;

// Mã voucher: chữ hoa, số, gạch dưới, gạch ngang (sau khi chuẩn hóa)
export const VOUCHER_CODE_REGEX = /^[A-Z0-9_-]{3,30}$/;
export const VOUCHER_CODE_MAX_LENGTH = 30;
// Khớp cột DB (VARCHAR(191))
export const VOUCHER_DESCRIPTION_MAX_LENGTH = 191;
export const MAX_INT = 2_147_483_647;

// Lọc theo status làm trong bộ nhớ: chỉ xét tối đa chừng này voucher (theo thứ tự sắp xếp đã chọn)
export const MAX_STATUS_FILTER_SCAN = 1000;

export const VOUCHER_SORT_FIELDS = [
  'createdAt',
  'code',
  'startsAt',
  'expiresAt',
  'usedCount',
] as const;
export type VoucherSortField = (typeof VOUCHER_SORT_FIELDS)[number];
