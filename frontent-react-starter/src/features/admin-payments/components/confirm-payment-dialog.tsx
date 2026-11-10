import { FormDialog } from "@/components/shared/form-dialog"
import { useConfirmPaymentAction } from "../use-confirm-payment-action"
import type { ConfirmOrderTarget, PaymentTransaction } from "../types"
import { ConfirmPaymentForm } from "./confirm-payment-form"

/** Hộp thoại "Xác nhận đã nhận tiền". `order = null` kèm `transaction` là giao dịch không khớp đơn (có ô chọn đơn). Hộp không đóng được khi đang gửi. */
function ConfirmPaymentDialog({
  open,
  onOpenChange,
  order,
  transaction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ConfirmOrderTarget | null
  transaction: PaymentTransaction | null
}) {
  const action = useConfirmPaymentAction({ onDone: () => onOpenChange(false) })
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={action.loading}
      title={order ? `Xác nhận đã nhận tiền: đơn ${order.code}` : "Xác nhận thanh toán cho đơn"}
      description="Ghi nhận khách đã chuyển khoản đủ và chuyển đơn sang bước xác nhận của nhân viên. Chỉ quản trị viên làm được."
    >
      <ConfirmPaymentForm
        order={order}
        transaction={transaction}
        busy={action.loading}
        formError={action.error}
        onCancel={() => onOpenChange(false)}
        onSubmit={(target, note) => action.submit(target, note, transaction?.id)}
      />
    </FormDialog>
  )
}

export { ConfirmPaymentDialog }
