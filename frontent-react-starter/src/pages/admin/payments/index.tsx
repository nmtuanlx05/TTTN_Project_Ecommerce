import { PageHeader } from "@/components/admin/page-header"
import { confirmTarget } from "@/features/admin-payments/confirm-target"
import { ConfirmPaymentDialog } from "@/features/admin-payments/components/confirm-payment-dialog"
import { ResolveDialog } from "@/features/admin-payments/components/resolve-dialog"
import { TransactionsContent } from "@/features/admin-payments/components/transactions-content"
import { TransactionsToolbar } from "@/features/admin-payments/components/transactions-toolbar"
import type { PaymentTransaction } from "@/features/admin-payments/types"
import { useAdminPaymentsSearchParams } from "@/features/admin-payments/use-admin-payments-search-params"
import { useDialogTarget } from "@/hooks/use-dialog-target"

/** /admin/payments — chỉ ADMIN (guard ở routes). Giao dịch chuyển khoản cần xem lại: xác nhận cho đơn hoặc đánh dấu đã xử lý. */
function PaymentsPage() {
  const search = useAdminPaymentsSearchParams()
  const confirm = useDialogTarget<PaymentTransaction>()
  const resolve = useDialogTarget<PaymentTransaction>()
  const transaction = confirm.target
  // Giao dịch thiếu tiền đã gắn đơn: xác nhận thẳng; không khớp: để trống để hộp thoại hiện ô chọn đơn.
  const order =
    transaction?.order && confirmTarget(transaction) === "order"
      ? { id: transaction.order.id, code: transaction.order.code, totalAmount: transaction.order.totalAmount }
      : null

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Giao dịch cần xem lại"
        description="Chuyển khoản thiếu tiền, không khớp đơn hoặc đến sau khi đơn đã đóng. Hoàn tiền (nếu cần) làm ở ngân hàng rồi đánh dấu đã xử lý."
      />
      <div className="flex flex-col gap-stack">
        <TransactionsToolbar review={search.review} onChange={search.setReview} />
        <TransactionsContent search={search} onConfirm={confirm.show} onResolve={resolve.show} />
      </div>
      <ConfirmPaymentDialog {...confirm.dialogProps} order={order} transaction={transaction} />
      <ResolveDialog {...resolve.dialogProps} transaction={resolve.target} />
    </div>
  )
}

export default PaymentsPage
