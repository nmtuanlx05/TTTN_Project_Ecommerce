import { ArrowDown, ArrowUp } from "lucide-react"
import { formatDateTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EXPORT_REASON_LABEL, MOVEMENT_TYPE_LABEL } from "../constants"
import { isExportReason } from "../schemas"
import type { StockMovement } from "../types"

/** EXPORT lưu mã nên ánh xạ sang nhãn; ADJUST là chữ tự do, hiển thị nguyên văn; loại lạ cũng nguyên văn. */
function reasonText(movement: StockMovement): string | null {
  if (movement.reason === null) return null
  if (movement.type === "EXPORT" && isExportReason(movement.reason)) {
    return EXPORT_REASON_LABEL[movement.reason]
  }
  return movement.reason
}

/** Một dòng lịch sử. Số lượng có dấu + mũi tên + chữ ẩn cho trình đọc màn hình, không chỉ dựa vào màu. */
function MovementItem({ movement }: { movement: StockMovement }) {
  const increase = movement.quantity > 0
  const Icon = increase ? ArrowUp : ArrowDown
  const reason = reasonText(movement)
  const author = movement.createdBy.name?.trim() || `Người dùng #${movement.createdBy.id}`

  return (
    <li className="flex flex-col gap-1 border-b border-border-subtle py-2 last:border-b-0">
      <div className="flex items-center justify-between gap-inline">
        <span className="text-body-sm font-medium text-ink">
          {MOVEMENT_TYPE_LABEL[movement.type] ?? movement.type}
        </span>
        <time dateTime={movement.createdAt} className="text-caption whitespace-nowrap text-ink-muted">
          {formatDateTime(movement.createdAt)}
        </time>
      </div>
      <div className="flex flex-wrap items-center gap-x-stack gap-y-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-body-sm font-semibold",
            increase ? "text-success-fg" : "text-danger-fg",
          )}
          data-numeric
        >
          <Icon className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{increase ? "Tăng" : "Giảm"}</span>
          {increase ? "+" : "−"}
          {formatNumber(Math.abs(movement.quantity))}
        </span>
        <span className="text-body-sm text-ink-muted" data-numeric>
          Tồn {formatNumber(movement.stockBefore)} → {formatNumber(movement.stockAfter)}
        </span>
      </div>
      {reason ? <p className="text-body-sm text-ink">Lý do: {reason}</p> : null}
      {movement.note ? <p className="text-body-sm text-ink-muted">Ghi chú: {movement.note}</p> : null}
      <p className="text-caption text-ink-muted">Bởi {author}</p>
    </li>
  )
}

export { MovementItem }
