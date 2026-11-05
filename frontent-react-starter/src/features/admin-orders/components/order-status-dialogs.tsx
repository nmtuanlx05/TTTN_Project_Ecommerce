import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { FormDialog } from "@/components/shared/form-dialog"
import { ACTION_LABEL, type OrderAction } from "../constants"
import type { OrderStatusAction } from "../use-order-status-action"
import { CancelOrderForm } from "./cancel-order-form"

/** Hậu quả của từng bước, nói rõ trước khi người dùng bấm xác nhận. */
const CONSEQUENCE: Record<Exclude<OrderAction, "cancel">, string> = {
  confirm:
    'Đơn chuyển sang "Đã xác nhận" và bạn trở thành người phụ trách đơn này. Hàng vẫn đang được giữ chỗ, chưa trừ khỏi kho.',
  ship: 'Hàng sẽ được trừ khỏi kho (giảm cả tồn kho lẫn hàng giữ chỗ). Sau bước này KHÔNG hủy được đơn nữa.',
  complete: "Đơn COD sẽ được ghi là đã thanh toán. Thao tác này không thể hoàn tác.",
}

/**
 * Hộp thoại đổi trạng thái, dựng một lần và điều khiển bằng state (`action.action` giữ lại khi đóng nên chữ
 * không đổi lúc mờ dần). Nút xác nhận khóa khi đang gửi; hộp không đóng được giữa chừng.
 */
function OrderStatusDialogs({ code, action }: { code: string; action: OrderStatusAction }) {
  const current = action.action
  const isCancel = current === "cancel"

  return (
    <>
      <ConfirmDialog
        open={action.open && current !== null && !isCancel}
        onOpenChange={action.onOpenChange}
        title={current && !isCancel ? `${ACTION_LABEL[current]}: đơn ${code}?` : ""}
        description={current && !isCancel ? CONSEQUENCE[current] : null}
        confirmLabel={current ? ACTION_LABEL[current] : ""}
        loading={action.loading}
        error={action.error}
        onConfirm={() => current && action.submit(current)}
      />
      <FormDialog
        open={action.open && isCancel}
        onOpenChange={action.onOpenChange}
        busy={action.loading}
        title={`Hủy đơn ${code}?`}
        description="Hàng đang giữ chỗ và lượt dùng voucher (nếu có) sẽ được trả lại. Đơn đã hủy không thể mở lại."
      >
        <CancelOrderForm
          busy={action.loading}
          formError={action.error}
          onCancel={() => action.onOpenChange(false)}
          onSubmit={(reason) => action.submit("cancel", reason)}
        />
      </FormDialog>
    </>
  )
}

export { OrderStatusDialogs }
