import { FormDialog } from "@/components/shared/form-dialog"
import { formatVnd } from "@/lib/format"
import { useResolveAction } from "../use-resolve-action"
import type { PaymentTransaction } from "../types"
import { ResolveForm } from "./resolve-form"

/** Hộp thoại "Đánh dấu đã xử lý": giao dịch đã được xử lý NGOÀI hệ thống (hoàn tiền...). Không đổi trạng thái đơn. */
function ResolveDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: PaymentTransaction | null
}) {
  const action = useResolveAction({ onDone: () => onOpenChange(false) })
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={action.loading}
      title="Đánh dấu giao dịch đã xử lý"
      description={
        transaction
          ? `Giao dịch ${formatVnd(transaction.amount)} sẽ rời khỏi danh sách cần xem lại. Không đổi trạng thái đơn và không hoàn tiền: hoàn tiền (nếu cần) làm trước ở ngân hàng.`
          : ""
      }
    >
      <ResolveForm
        busy={action.loading}
        formError={action.error}
        onCancel={() => onOpenChange(false)}
        onSubmit={(note) => transaction && action.submit(transaction.id, note)}
      />
    </FormDialog>
  )
}

export { ResolveDialog }
