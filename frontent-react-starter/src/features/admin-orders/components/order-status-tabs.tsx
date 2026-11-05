import { ORDER_STATUS } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STATUS_TABS } from "../constants"
import type { OrderStatus } from "../types"

const TABS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tất cả" },
  ...STATUS_TABS.map((status) => ({ value: status, label: ORDER_STATUS[status].label })),
]

/** Hàng nút lọc nhanh theo trạng thái (nút bật/tắt). Không kèm số đếm vì backend chưa có API đếm cho admin. */
function OrderStatusTabs({
  status,
  onSelect,
}: {
  status: OrderStatus | undefined
  onSelect: (status: OrderStatus | undefined) => void
}) {
  return (
    <div role="group" aria-label="Lọc nhanh theo trạng thái đơn" className="flex flex-wrap gap-inline">
      {TABS.map(({ value, label }) => {
        const pressed = status === value
        return (
          <button
            key={label}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(value)}
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

export { OrderStatusTabs }
