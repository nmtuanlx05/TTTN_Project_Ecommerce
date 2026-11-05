import type { ApiError } from "@/lib/api-error"
import { ERROR_CODE, GENERIC_ERROR, LOCATION_ERROR_FIELD, VOUCHER_ERROR_CODES } from "./constants"
import type { CheckoutFormValues } from "./schemas"

type FieldName = keyof CheckoutFormValues

/** Cách giao diện phản ứng với lỗi đặt đơn. Chỉ dùng mã có trong docs/api/orders.md; mã khác dựa vào status và thông báo chung. */
export type PlaceOrderFailure =
  | { kind: "cart-empty" }
  | { kind: "unavailable"; messages: string[] }
  | { kind: "voucher"; message: string }
  | { kind: "field"; field: FieldName; message: string }
  | { kind: "busy"; message: string }
  | { kind: "general"; message: string }

export function classifyPlaceOrderError(error: ApiError): PlaceOrderFailure {
  const { code, statusCode } = error
  if (code === ERROR_CODE.cartEmpty) return { kind: "cart-empty" }
  if (code === ERROR_CODE.itemsUnavailable) {
    const messages = error.errors.map((item) => item.message)
    return { kind: "unavailable", messages: messages.length > 0 ? messages : [error.message] }
  }
  if (code && VOUCHER_ERROR_CODES.includes(code)) return { kind: "voucher", message: error.message }
  const field = code ? LOCATION_ERROR_FIELD[code] : undefined
  if (field) return { kind: "field", field, message: error.message }
  if (code === ERROR_CODE.systemBusy) return { kind: "busy", message: error.message }
  if (statusCode === 403) return { kind: "general", message: "Tài khoản quản trị không dùng để mua hàng" }
  return { kind: "general", message: error.message || GENERIC_ERROR }
}
