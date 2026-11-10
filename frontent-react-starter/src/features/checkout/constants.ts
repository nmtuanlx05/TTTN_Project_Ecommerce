/** Số thẻ voucher hiện trước khi bấm "Xem thêm". */
export const VOUCHER_PREVIEW_COUNT = 3

/** Chỉ các mã lỗi có trong docs/api/orders.md (bảng lỗi). */
export const ERROR_CODE = {
  cartEmpty: "CART_EMPTY",
  itemsUnavailable: "CART_ITEMS_UNAVAILABLE",
  systemBusy: "SYSTEM_BUSY",
  paymentNotSupported: "PAYMENT_METHOD_NOT_SUPPORTED",
  paymentNotRequired: "PAYMENT_NOT_REQUIRED",
} as const

/** Mã lỗi voucher (docs/api/orders.md). */
export const VOUCHER_ERROR_CODES: readonly string[] = [
  "VOUCHER_NOT_FOUND",
  "VOUCHER_INACTIVE",
  "VOUCHER_NOT_STARTED",
  "VOUCHER_EXPIRED",
  "VOUCHER_MIN_ORDER",
  "VOUCHER_USAGE_LIMIT",
]

/** Mã lỗi địa chỉ (docs/api/orders.md) -> ô của form. */
export const LOCATION_ERROR_FIELD: Record<string, "provinceCode" | "districtCode" | "wardCode"> = {
  PROVINCE_NOT_FOUND: "provinceCode",
  DISTRICT_NOT_FOUND: "districtCode",
  DISTRICT_NOT_IN_PROVINCE: "districtCode",
  WARD_NOT_FOUND: "wardCode",
  WARD_NOT_IN_DISTRICT: "wardCode",
  WARD_REQUIRED: "wardCode",
  WARD_NOT_ALLOWED: "wardCode",
}

export const GENERIC_ERROR = "Không đặt được hàng, vui lòng thử lại."

/**
 * Kênh thanh toán online của ô "Chọn hình thức". Backend chỉ có chuyển khoản VietQR; ví điện tử và thẻ (VNPay) NGOÀI phạm vi hiện tại nên
 * `enabled: false` và bị ẩn khỏi giao diện (không xóa để sau này bật lại bằng cách đổi cờ). Chỉ kênh `enabled` được hiển thị; kênh `enabled` đầu tiên
 * là kênh đang chọn. Còn một kênh thì ô không vẽ chip (xem `PaymentMethodPanel`).
 */
export const PAYMENT_CHANNELS = [
  { id: "bank-qr", label: "Quét mã QR ngân hàng", enabled: true },
  { id: "e-wallet", label: "Ví điện tử", enabled: false },
  { id: "card", label: "Thẻ ATM / Visa", enabled: false },
] as const

export const CHANNEL_SOON_LABEL = "Sắp có"
