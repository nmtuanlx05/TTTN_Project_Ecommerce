import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import type { ApiError } from "@/lib/api-error"

/**
 * Đẩy lỗi theo từng trường của server (`error.errors`, dạng backend trả khi 400) vào đúng ô
 * của react-hook-form; ô lỗi đầu tiên được focus. Trả về thông điệp chung cho phần còn lại
 * (trường không có ô nào, hoặc `error.message` khi server không chỉ ra trường nào), hoặc
 * `null` nếu mọi lỗi đã gắn được vào ô. Lỗi theo status (401, 409...) do từng form tự xử lý.
 */
export function applyServerErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const unmapped: string[] = []
  let focused = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const name = fields.find((candidate) => candidate === field)
    if (name) {
      setError(name, { message }, { shouldFocus: !focused })
      focused = true
    } else {
      unmapped.push(message)
    }
  }
  if (unmapped.length > 0) return unmapped.join(" ")
  return focused ? null : error.message
}
