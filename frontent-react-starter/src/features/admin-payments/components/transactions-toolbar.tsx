import { cn } from "@/lib/utils"
import { REVIEW_FILTERS } from "../constants"
import type { ReviewFilter } from "../types"

/** Nút lọc theo trạng thái xử lý (chưa xử lý / đã xử lý / tất cả), nút bật/tắt như ở danh sách đơn. */
function TransactionsToolbar({ review, onChange }: { review: ReviewFilter; onChange: (review: ReviewFilter) => void }) {
  return (
    <div role="group" aria-label="Lọc giao dịch theo trạng thái xử lý" className="flex flex-wrap gap-inline">
      {REVIEW_FILTERS.map(({ value, label }) => {
        const pressed = review === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(value)}
            className={cn(
              "h-control rounded-md border px-3 text-body-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              pressed
                ? "border-ink bg-primary text-primary-fg"
                : "border-border-subtle bg-surface text-ink-muted hover:bg-surface-hover hover:text-ink",
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export { TransactionsToolbar }
