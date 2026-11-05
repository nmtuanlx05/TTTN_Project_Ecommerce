import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Thẻ chọn kiểu radio (một trong nhóm `role="radiogroup"` do nơi dùng dựng). Chọn: viền mực đậm; không chọn: viền control.
 * `unavailable`: hiện đúng như thẻ thường nhưng không chọn được (`aria-disabled`), bấm thì chạy `onSelect` để nơi dùng báo "sắp có".
 */
function RadioCard({
  checked,
  unavailable,
  title,
  description,
  icon,
  onSelect,
}: {
  checked: boolean
  unavailable?: boolean
  title: string
  description: string
  icon: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={unavailable || undefined}
      onClick={onSelect}
      className={cn(
        "press flex w-full items-center gap-3 rounded-card border bg-surface p-4 text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "border-2 border-ink" : "border-border-control hover:border-ink-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-4xl border",
          checked ? "border-ink" : "border-border-control",
        )}
      >
        {checked ? <span className="size-2.5 rounded-4xl bg-ink" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body-sm font-semibold text-ink">{title}</span>
        <span className="text-caption text-ink-muted">{description}</span>
      </span>
      <span className="shrink-0 text-ink-muted">{icon}</span>
    </button>
  )
}

export { RadioCard }
