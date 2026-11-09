import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import { ERROR_CODE } from "./constants"
import { useResolveTransaction } from "./queries"

/**
 * Luồng "Đánh dấu đã xử lý". 409 `PAYMENT_TXN_ALREADY_RESOLVED`/`PAYMENT_TXN_NOT_REVIEWABLE`, 404, 403: đóng hộp, báo bằng toast, danh sách tự làm mới;
 * còn lại (400, mất mạng): hộp vẫn mở và hiện thông báo. `onDone`: nơi gọi đóng hộp thoại.
 */
export function useResolveAction({ onDone }: { onDone: () => void }) {
  const mutation = useResolveTransaction()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  const fail = (apiError: ApiError) => {
    const { statusCode, code } = apiError
    const toastMessage =
      code === ERROR_CODE.txnAlreadyResolved
        ? "Giao dịch đã được người khác xử lý."
        : code === ERROR_CODE.txnNotReviewable
          ? "Giao dịch này không nằm trong danh sách cần xem lại."
          : statusCode === 404
            ? "Không tìm thấy giao dịch này."
            : statusCode === 403
              ? "Chỉ quản trị viên được xử lý giao dịch."
              : null
    if (toastMessage) {
      onDone()
      toast.add({ title: toastMessage, data: { tone: "danger" } })
      return
    }
    setError(apiError.isNetworkError ? "Chưa rõ thao tác đã được ghi hay chưa vì mất kết nối. Dữ liệu đang được làm mới, hãy kiểm tra lại trước khi thử." : apiError.message)
  }

  const submit = (id: number, note: string) => {
    if (mutation.isPending) return
    setError(null)
    mutation.mutate(
      { id, note },
      {
        onSuccess: () => {
          onDone()
          toast.add({ title: "Đã đánh dấu giao dịch là đã xử lý", data: { tone: "success" } })
        },
        onError: fail,
      },
    )
  }

  return { submit, loading: mutation.isPending, error }
}
