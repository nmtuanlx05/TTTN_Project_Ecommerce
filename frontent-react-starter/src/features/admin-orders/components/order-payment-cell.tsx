import { Badge, PaymentStatusBadge } from "@/components/ui/badge"
import { PAYMENT_METHOD_LABEL } from "../constants"
import type { AdminPaymentMethod, AdminPaymentStatus } from "../types"

/** Phương thức thanh toán kèm trạng thái. `FAILED` (chỉ có với thanh toán online, bản này chưa dùng) dùng hình thức rỗng như UNPAID. */
function OrderPaymentCell({ method, status }: { method: AdminPaymentMethod; status: AdminPaymentStatus }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span>{PAYMENT_METHOD_LABEL[method]}</span>
      {status === "FAILED" ? (
        <Badge variant="unpaid">Thanh toán lỗi</Badge>
      ) : (
        <PaymentStatusBadge status={status} />
      )}
    </div>
  )
}

export { OrderPaymentCell }
