import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  ACTION_LABEL,
  NO_ACTION_NOTE,
  ORDER_ACTIONS,
  PAID_ADMIN_ONLY_MESSAGE,
  isAwaitingBankTransfer,
  type OrderAction,
} from "../constants"
import type { AdminOrder } from "../types"

/**
 * Khối hành động nổi bật: chỉ hiện bước hợp lệ theo trạng thái hiện tại. Nút khóa khi đang gửi. Bước chính là `primary`, "Hủy đơn" là `destructive`.
 * Khác biệt theo vai trò: đơn đã thanh toán thì chỉ ADMIN thấy "Hủy đơn" (STAFF thấy ghi chú); "Xác nhận đã nhận tiền" chỉ ADMIN và chỉ với đơn online
 * chờ chuyển khoản, do trang ghép đưa vào `paymentAction` (features không import lẫn nhau). Backend vẫn là nơi chặn thật.
 */
function OrderActionsPanel({
  order,
  isAdmin,
  loading,
  paymentAction,
  onAction,
}: {
  order: Pick<AdminOrder, "status" | "paymentMethod" | "paymentStatus">
  isAdmin: boolean
  loading: boolean
  paymentAction?: ReactNode
  onAction: (action: OrderAction) => void
}) {
  const { status } = order
  const paidLocked = order.paymentStatus === "PAID" && !isAdmin
  const actions = ORDER_ACTIONS[status].filter((action) => !(action === "cancel" && paidLocked))
  const awaiting = isAwaitingBankTransfer(order)
  return (
    <section
      aria-labelledby="order-actions"
      className="flex flex-col gap-stack rounded-md border border-border-strong bg-surface-raised p-card"
    >
      <h2 id="order-actions" className="font-display text-h3 text-ink">
        Xử lý đơn
      </h2>
      {awaiting ? (
        <p className="text-body-sm text-ink-muted">
          Đơn đang chờ khách chuyển khoản. Hệ thống tự xác nhận khi nhận được tiền
          {isAdmin ? "; nếu webhook không tới, bạn có thể xác nhận thủ công sau khi đối chiếu sao kê." : ". Xác nhận thủ công chỉ dành cho quản trị viên."}
        </p>
      ) : null}
      {paidLocked && ORDER_ACTIONS[status].includes("cancel") ? (
        <p className="text-body-sm text-ink-muted">{PAID_ADMIN_ONLY_MESSAGE}</p>
      ) : null}
      {actions.length === 0 && !(awaiting && isAdmin) ? (
        <p className="text-body-sm text-ink-muted">{NO_ACTION_NOTE[status]}</p>
      ) : (
        <div className="flex flex-col gap-inline sm:flex-row">
          {awaiting && isAdmin ? paymentAction : null}
          {actions.map((action) => (
            <Button
              key={action}
              variant={action === "cancel" ? "destructive" : "primary"}
              disabled={loading}
              onClick={() => onAction(action)}
            >
              {ACTION_LABEL[action]}
            </Button>
          ))}
        </div>
      )}
    </section>
  )
}

export { OrderActionsPanel }
