import { Button } from "@/components/ui/button"
import { ACTION_LABEL, NO_ACTION_NOTE, ORDER_ACTIONS, type OrderAction } from "../constants"
import type { OrderStatus } from "../types"

/**
 * Khối hành động nổi bật: chỉ hiện bước hợp lệ theo trạng thái hiện tại (ADMIN và STAFF như nhau). Nút khóa khi
 * đang gửi. Bước chính là `primary`, "Hủy đơn" là `destructive`.
 */
function OrderActionsPanel({
  status,
  loading,
  onAction,
}: {
  status: OrderStatus
  loading: boolean
  onAction: (action: OrderAction) => void
}) {
  const actions = ORDER_ACTIONS[status]
  return (
    <section
      aria-labelledby="order-actions"
      className="flex flex-col gap-stack rounded-md border border-border-strong bg-surface-raised p-card"
    >
      <h2 id="order-actions" className="font-display text-h3 text-ink">
        Xử lý đơn
      </h2>
      {actions.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{NO_ACTION_NOTE[status]}</p>
      ) : (
        <div className="flex flex-col gap-inline sm:flex-row">
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
