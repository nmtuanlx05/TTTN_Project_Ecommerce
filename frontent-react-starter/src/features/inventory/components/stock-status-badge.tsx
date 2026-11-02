import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STOCK_STATUS_LABEL } from "../constants"
import { STOCK_STATUS_ICON } from "../stock-status-icon"
import type { StockStatus } from "../types"

/** Còn hàng là badge trung tính; sắp hết và hết hàng dùng token cảnh báo và nguy hiểm, luôn kèm icon và chữ. */
const TONE: Record<StockStatus, string | undefined> = {
  in_stock: undefined,
  low: "border-warning-border bg-warning-tint text-warning-fg",
  out: "border-danger-border bg-danger-tint text-danger-fg",
}

function StockStatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  const Icon = STOCK_STATUS_ICON[status]
  return (
    <Badge variant={status === "in_stock" ? "neutral" : "outline"} className={cn(TONE[status], className)}>
      <Icon aria-hidden="true" />
      {STOCK_STATUS_LABEL[status]}
    </Badge>
  )
}

export { StockStatusBadge }
