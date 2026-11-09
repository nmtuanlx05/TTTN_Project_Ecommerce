import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import { useDialogTarget } from "@/hooks/use-dialog-target"
import type { ApiError } from "@/lib/api-error"
import { ACTION_TARGET, ERROR_CODE, PAID_ADMIN_ONLY_MESSAGE, type OrderAction } from "./constants"
import { useUpdateOrderStatus } from "./queries"

const SUCCESS_TITLE: Record<OrderAction, string> = {
  confirm: "Đã xác nhận đơn",
  ship: "Đã bắt đầu giao đơn",
  complete: "Đã hoàn tất giao đơn",
  cancel: "Đã hủy đơn",
}

const NETWORK_MESSAGE =
  "Chưa rõ thao tác đã được ghi hay chưa vì mất kết nối. Dữ liệu đang được làm mới, hãy kiểm tra trạng thái đơn trước khi thử lại."

/**
 * Luồng đổi trạng thái đơn. Hộp xác nhận mở theo hành động; lỗi theo mã backend (docs/api/orders.md):
 * - 409 `ORDER_INVALID_TRANSITION` (đơn vừa bị người khác đổi): đóng hộp, báo, danh sách và chi tiết tự làm mới;
 * - 404 / 403 (kể cả `ORDER_PAID_ADMIN_ONLY`: STAFF hủy đơn đã thanh toán): đóng hộp, báo bằng toast;
 * - còn lại (400 lý do, `SYSTEM_BUSY`, 409 không đủ tồn khi giao và không có `code`, mất mạng): hộp vẫn mở và hiện
 *   thông báo nguyên văn của backend để người dùng đọc. Không tự thử lại vì API không có khóa chống gửi trùng.
 */
export function useOrderStatusAction(order: { id: number; code: string }) {
  const dialog = useDialogTarget<OrderAction>()
  const mutation = useUpdateOrderStatus()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  function fail(apiError: ApiError) {
    const { statusCode, code } = apiError
    if (code === ERROR_CODE.invalidTransition) {
      dialog.hide()
      toast.add({
        title: "Đơn vừa được cập nhật ở nơi khác",
        description: "Trạng thái đơn đã thay đổi, nên thao tác này không còn hợp lệ. Dữ liệu đã được làm mới.",
        data: { tone: "danger" },
      })
    } else if (statusCode === 404 || code === ERROR_CODE.notFound) {
      dialog.hide()
      toast.add({ title: "Không tìm thấy đơn hàng này", data: { tone: "danger" } })
    } else if (statusCode === 403) {
      dialog.hide()
      toast.add({
        title: code === ERROR_CODE.paidAdminOnly ? PAID_ADMIN_ONLY_MESSAGE : "Bạn không đủ quyền thực hiện thao tác này",
        data: { tone: "danger" },
      })
    } else {
      setError(apiError.isNetworkError ? NETWORK_MESSAGE : apiError.message)
    }
  }

  function submit(action: OrderAction, reason?: string) {
    if (mutation.isPending) return
    setError(null)
    mutation.mutate(
      { id: order.id, status: ACTION_TARGET[action], ...(reason ? { reason } : {}) },
      {
        onSuccess: () => {
          dialog.hide()
          toast.add({ title: SUCCESS_TITLE[action], description: order.code, data: { tone: "success" } })
        },
        onError: fail,
      },
    )
  }

  return {
    action: dialog.target,
    open: dialog.open,
    loading: mutation.isPending,
    error,
    request: (action: OrderAction) => {
      setError(null)
      dialog.show(action)
    },
    onOpenChange: (next: boolean) => {
      if (!next) setError(null)
      dialog.dialogProps.onOpenChange(next)
    },
    submit,
  }
}

export type OrderStatusAction = ReturnType<typeof useOrderStatusAction>
