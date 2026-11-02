import type { ComponentType } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Một thẻ số liệu, là nút bật/tắt lọc theo trạng thái (`aria-pressed`). `value` là `undefined` khi đang tải. */
function InventorySummaryCard({
  label,
  value,
  icon: Icon,
  pressed,
  onClick,
}: {
  label: string
  value: number | undefined
  icon?: ComponentType<{ className?: string }>
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-md border p-card text-left outline-none transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed
          ? "border-ink bg-surface-raised"
          : "border-border-subtle bg-surface hover:bg-surface-hover",
      )}
    >
      <span className="flex items-center gap-1.5 text-body-sm text-ink-muted">
        {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
        {label}
      </span>
      {value === undefined ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <span className="font-display text-h2 text-ink" data-numeric>
          {formatNumber(value)}
        </span>
      )}
    </button>
  )
}

export { InventorySummaryCard }
