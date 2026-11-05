import type { ApiError } from "@/lib/api-error"
import type { VoucherFormValues } from "./schemas"

type FormField = keyof VoucherFormValues

/** Tên trường backend trả trong `errors[].field` trùng tên ô của form. */
const FORM_FIELDS: readonly string[] = [
  "code",
  "description",
  "discountType",
  "discountValue",
  "maxDiscount",
  "minOrderValue",
  "usageLimit",
  "startsAtDate",
  "expiresAtDate",
]

export interface MappedVoucherError {
  /** Lỗi gắn vào từng ô (ô đầu tiên được focus). */
  fields: Partial<Record<FormField, string>>
  /** Thông báo cho phần không gắn được vào ô; `null` nếu mọi lỗi đã có ô. */
  toast: { title: string; description: string } | null
  /** Dữ liệu trên màn hình có thể đã cũ: làm mới danh sách và chi tiết. */
  refresh: boolean
  /** Voucher không còn tồn tại: đóng form. */
  close: boolean
}

/** Đổi lỗi API thành thứ giao diện hiển thị (pure, không đụng form hay toast). Mã lỗi: docs/api/vouchers.md. */
export function mapVoucherError(error: ApiError, mode: "create" | "edit"): MappedVoucherError {
  const title = mode === "create" ? "Chưa tạo được voucher" : "Chưa lưu được thay đổi"
  const result: MappedVoucherError = { fields: {}, toast: null, refresh: false, close: false }

  if (error.statusCode === 403) {
    result.toast = { title, description: "Bạn không có quyền quản lý voucher. Chỉ quản trị viên được dùng mục này." }
    return result
  }
  if (error.statusCode === 404 || error.code === "VOUCHER_NOT_FOUND") {
    result.toast = {
      title: "Không tìm thấy voucher này",
      description: "Voucher có thể đã bị đổi. Danh sách đã được làm mới.",
    }
    result.refresh = true
    result.close = true
    return result
  }
  if (error.code === "VOUCHER_CODE_EXISTS") {
    result.fields.code = "Mã này đã được dùng cho voucher khác. Nhập mã khác."
    return result
  }
  if (error.code === "VOUCHER_USAGE_LIMIT_TOO_LOW") {
    result.fields.usageLimit = error.fieldErrors.usageLimit ?? error.message
    return result
  }
  if (error.code === "VOUCHER_FIELD_LOCKED") {
    result.toast = {
      title,
      description:
        "Voucher đã có người dùng nên không đổi được mã, loại giảm, giá trị, mức giảm tối đa hay ngày bắt đầu. Muốn đổi, hãy tắt voucher này và tạo voucher mới.",
    }
    result.refresh = true
    return result
  }

  // VOUCHER_INVALID_CONFIG, INVALID_DATE, lỗi validate chung: gắn theo `errors[].field` nếu có.
  const unmapped: string[] = []
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (FORM_FIELDS.includes(field)) result.fields[field as FormField] = message
    else unmapped.push(message)
  }
  const hasField = Object.keys(result.fields).length > 0
  if (unmapped.length > 0 || !hasField) {
    result.toast = { title, description: unmapped.length > 0 ? unmapped.join(" ") : error.message }
  }
  return result
}
