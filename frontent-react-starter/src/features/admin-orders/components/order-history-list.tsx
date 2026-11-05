import { ORDER_STATUS } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"
import { ACTOR_ROLE_LABEL } from "../constants"
import type { AdminOrderActor, AdminOrderHistoryEntry } from "../types"

/** Người đổi: có tên thì hiện kèm vai trò; `null` là hệ thống. Đơn do khách đặt/hủy có `role = CUSTOMER`. */
function actorLabel(actor: AdminOrderActor | null): string {
  if (!actor) return "Hệ thống"
  const role = ACTOR_ROLE_LABEL[actor.role]
  return actor.name ? `${actor.name} (${role})` : role
}

function transitionLabel(entry: AdminOrderHistoryEntry): string {
  const to = ORDER_STATUS[entry.toStatus].label
  return entry.fromStatus ? `${ORDER_STATUS[entry.fromStatus].label} → ${to}` : `Tạo đơn: ${to}`
}

/** Lịch sử trạng thái, cũ nhất trước (đúng thứ tự backend trả). */
function OrderHistoryList({ history }: { history: AdminOrderHistoryEntry[] }) {
  return (
    <section aria-labelledby="order-history" className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <h2 id="order-history" className="font-display text-h3 text-ink">
        Lịch sử trạng thái
      </h2>
      <ol className="flex flex-col gap-stack">
        {history.map((entry, index) => (
          <li key={index} className="flex flex-col gap-0.5 border-l-2 border-border-default pl-3">
            <span className="text-body-sm font-medium text-ink">{transitionLabel(entry)}</span>
            <span className="text-caption text-ink-muted">
              {actorLabel(entry.actor)} · {formatDateTime(entry.createdAt)}
            </span>
            {entry.reason ? <span className="text-body-sm text-ink">Lý do: {entry.reason}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

export { OrderHistoryList }
