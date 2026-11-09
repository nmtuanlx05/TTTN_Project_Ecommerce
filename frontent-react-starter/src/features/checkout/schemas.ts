import { z } from "zod"

/** Số điện thoại: đúng 10 số, đầu 03/05/07/08/09 (backend không nhận +84 ở đơn hàng). */
const PHONE_REGEX = /^0[35789]\d{8}$/

/**
 * Quy tắc phản chiếu CreateOrderDto (docs/api/orders.md). `hasWards`: quận/huyện đã chọn có phường/xã hay không (biết sau khi tải
 * danh sách phường), quyết định `wardCode` có bắt buộc. Tạo lại schema (và resolver) khi cờ đổi.
 */
export function buildCheckoutSchema(hasWards: boolean) {
  return z.object({
    receiverName: z.string().trim().min(1, "Nhập họ và tên người nhận.").max(100, "Tên không được vượt quá 100 ký tự."),
    phone: z.string().trim().regex(PHONE_REGEX, "Số điện thoại phải gồm 10 số, đầu số 03, 05, 07, 08 hoặc 09."),
    provinceCode: z.string().min(1, "Chọn tỉnh/thành phố."),
    districtCode: z.string().min(1, "Chọn quận/huyện."),
    wardCode: hasWards ? z.string().min(1, "Chọn phường/xã.") : z.string(),
    addressLine: z.string().trim().min(1, "Nhập địa chỉ cụ thể.").max(255, "Địa chỉ không được vượt quá 255 ký tự."),
    note: z.string().trim().max(500, "Ghi chú không được vượt quá 500 ký tự."),
    paymentMethod: z.enum(["COD", "ONLINE"]),
  })
}

export type CheckoutFormValues = z.infer<ReturnType<typeof buildCheckoutSchema>>

export const CHECKOUT_FIELDS = [
  "receiverName",
  "phone",
  "provinceCode",
  "districtCode",
  "wardCode",
  "addressLine",
  "note",
  "paymentMethod",
] as const

/** `+84xxxxxxxxx` -> `0xxxxxxxxx` để điền sẵn từ tài khoản; số không hợp lệ thì để trống. */
export function normalizePhone(phone: string | null | undefined): string {
  const value = (phone ?? "").replace(/\s/g, "").replace(/^\+84/, "0")
  return PHONE_REGEX.test(value) ? value : ""
}
