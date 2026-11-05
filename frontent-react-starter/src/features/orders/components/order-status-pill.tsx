import { cn } from "@/lib/utils"
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, type OrderTone } from "../constants"
import type { OrderStatus } from "../types"

const TONE: Record<OrderTone, { pill: string; dot: string }> = {
  warning: { pill: "bg-warning-tint text-warning-fg", dot: "bg-warning-dot" },
  info: { pill: "bg-info-tint text-info-fg", dot: "bg-current" },
  success: { pill: "bg-success-tint text-success-fg", dot: "bg-current" },
  danger: { pill: "bg-danger-tint text-danger-fg", dot: "bg-current" },
  neutral: { pill: "bg-surface-sunken text-ink-muted", dot: "bg-current" },
}

/**
 * Viên trạng thái đơn của STOREFRONT: tông nhạt, chấm màu, nhãn từ `ORDER_STATUS_LABEL`. Admin dùng `OrderStatusBadge`
 * (components/ui/badge.tsx); thêm trạng thái phải sửa cả hai (CLAUDE.md, "Trạng thái đơn hàng").
 */
function OrderStatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = TONE[ORDER_STATUS_TONE[status]]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-4xl px-3 py-1 text-caption font-medium whitespace-nowrap",
        tone.pill,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-4xl", tone.dot)} />
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}

export { OrderStatusPill }
