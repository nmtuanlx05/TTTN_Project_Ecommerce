import { useState } from "react"
import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { UNCERTAIN_RESULT_MESSAGE } from "./constants"

/**
 * Lỗi khi gửi form đổi tồn: 400 theo ô → vào đúng ô; 404 → toast và đóng (danh sách đã được làm mới);
 * 403 → toast; còn lại (409, 400 không theo ô, 5xx) → `formError`, hiện nguyên văn trong hộp.
 *
 * `uncertainOnNetworkError`: mất mạng (statusCode 0) khi đổi tồn thì request có thể đã được ghi, nên nói
 * rõ là chưa biết kết quả thay vì chỉ "không kết nối được" (người dùng dễ bấm gửi lại và nhập trùng).
 * Đặt ngưỡng không đổi tồn nên để `false`.
 */
export function useStockMutationErrors<T extends FieldValues>(
  fields: readonly Path<T>[],
  uncertainOnNetworkError: boolean,
) {
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()

  function handle(error: ApiError, setError: UseFormSetError<T>, close: () => void) {
    if (error.statusCode === 404) {
      toast.add({
        title: "Không tìm thấy biến thể này",
        description: "Biến thể có thể đã bị xóa. Danh sách đã được làm mới.",
        data: { tone: "danger" },
      })
      close()
      return
    }

    if (error.statusCode === 403) {
      toast.add({ title: "Không đủ quyền", description: error.message, data: { tone: "danger" } })
      return
    }

    if (error.statusCode === 400) {
      setFormError(applyServerErrors(error, setError, fields))
      return
    }

    if (error.statusCode === 0 && uncertainOnNetworkError) {
      setFormError(UNCERTAIN_RESULT_MESSAGE)
      return
    }

    setFormError(error.message)
  }

  return { formError, clearError: () => setFormError(null), handle }
}
