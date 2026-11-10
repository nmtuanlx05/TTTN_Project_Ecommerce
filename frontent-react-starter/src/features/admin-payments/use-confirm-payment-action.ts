import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import { formatVnd } from "@/lib/format"
import { ERROR_CODE } from "./constants"
import { useConfirmPayment } from "./queries"
import type { ConfirmOrderTarget } from "./types"

const NETWORK_MESSAGE =
  "Chưa rõ thao tác đã được ghi hay chưa vì mất kết nối. Dữ liệu đang được làm mới, hãy kiểm tra trạng thái đơn trước khi thử lại."

/**
 * Luồng "Xác nhận đã nhận tiền" (chỉ ADMIN), lỗi theo mã backend (docs/api/payments.md):
 * - 409 `ORDER_NOT_AWAITING_PAYMENT`, 404 (đơn/giao dịch), 409 giao dịch đã xử lý/không còn trong danh sách, 403: đóng hộp, báo bằng toast, dữ liệu tự làm mới;
 * - 400 `PAYMENT_TXN_ORDER_MISMATCH` và còn lại (kể cả mất mạng): hộp vẫn mở và hiện thông báo để người dùng đọc. Không tự thử lại.
 * `onDone`: nơi gọi đóng hộp thoại.
 */
export function useConfirmPaymentAction({ onDone }: { onDone: () => void }) {
  const mutation = useConfirmPayment()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  const closeWithToast = (title: string) => {
    onDone()
    toast.add({ title, data: { tone: "danger" } })
  }

  const fail = (apiError: ApiError) => {
    const { statusCode, code } = apiError
    if (code === ERROR_CODE.notAwaitingPayment) {
      closeWithToast("Đơn không còn chờ thanh toán (đã hết hạn, đã hủy hoặc đã được xác nhận). Dữ liệu đã được làm mới.")
    } else if (code === ERROR_CODE.txnNotReviewable || code === ERROR_CODE.txnAlreadyResolved) {
      closeWithToast("Giao dịch này đã được xử lý hoặc không còn trong danh sách cần xem lại.")
    } else if (statusCode === 404) {
      closeWithToast(code === ERROR_CODE.txnNotFound ? "Không tìm thấy giao dịch này." : "Không tìm thấy đơn hàng này.")
    } else if (statusCode === 403) {
      closeWithToast("Chỉ quản trị viên được xác nhận thanh toán.")
    } else if (code === ERROR_CODE.txnOrderMismatch) {
      setError("Giao dịch này đang gắn với một đơn khác nên không thể xác nhận cho đơn này.")
    } else {
      setError(apiError.isNetworkError ? NETWORK_MESSAGE : apiError.message)
    }
  }

  const submit = (order: ConfirmOrderTarget, note: string, transactionId?: number) => {
    if (mutation.isPending) return
    setError(null)
    mutation.mutate(
      { orderId: order.id, note, ...(transactionId !== undefined ? { transactionId } : {}) },
      {
        onSuccess: (result) => {
          onDone()
          toast.add({
            title: "Đã xác nhận thanh toán",
            description: result.overpaid
              ? `${order.code}: giao dịch thừa tiền, cần hoàn phần thừa ngoài hệ thống.`
              : `${order.code} · ghi nhận ${formatVnd(order.totalAmount)}`,
            data: { tone: "success" },
          })
        },
        onError: fail,
      },
    )
  }

  return { submit, loading: mutation.isPending, error, clearError: () => setError(null) }
}
