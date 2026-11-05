/** Số thẻ voucher hiện trước khi bấm "Xem thêm". */
export const VOUCHER_PREVIEW_COUNT = 3

/** Chỉ các mã lỗi có trong docs/api/orders.md (bảng lỗi). */
export const ERROR_CODE = {
  cartEmpty: "CART_EMPTY",
  itemsUnavailable: "CART_ITEMS_UNAVAILABLE",
  systemBusy: "SYSTEM_BUSY",
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
