import type { KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { panelDomId, tabDomId } from "@/lib/tab-ids"

/** Tab đang chọn là nút đặc nhưng KHÔNG đảo màu khi hover (đảo sẽ trông như vừa bị bỏ chọn): ghi đè lại hover của variant `primary` trong phạm vi `soft-ui`. */
const SELECTED_TAB = "soft:hover:border-transparent soft:hover:bg-primary soft:hover:text-primary-fg soft:active:bg-primary-active soft:active:text-primary-fg"

interface TabItem {
  id: string
  label: string
}

/**
 * Thanh tab (`tablist`) kiểu APG: chỉ tab đang chọn nằm trong thứ tự Tab (tabindex luân chuyển), ←/→ chuyển tab (quay vòng) và KÍCH HOẠT ngay,
 * Home/End về tab đầu/cuối. Dạng viên thuốc: tab đang chọn là nút đặc (`primary`), tab còn lại là nút viền (`secondary`, hover đảo thành nút đặc); cao 44px. Nơi dùng đặt `role="tabpanel"`
 * với `id={panelDomId(prefix)}` và `aria-labelledby={tabDomId(prefix, <id tab đang chọn>)}` (`lib/tab-ids.ts`).
 */
function TabBar({
  prefix,
  label,
  tabs,
  selectedId,
  onSelect,
}: {
  prefix: string
  label: string
  tabs: readonly TabItem[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = tabs.findIndex((tab) => tab.id === selectedId)
    const target =
      event.key === "ArrowRight"
        ? (current + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (current - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null
    if (target === null) return
    event.preventDefault()
    onSelect(tabs[target].id)
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={move} className="flex flex-wrap gap-inline">
      {tabs.map((tab) => {
        const selected = tab.id === selectedId
        return (
          <Button
            key={tab.id}
            role="tab"
            id={tabDomId(prefix, tab.id)}
            aria-selected={selected}
            aria-controls={panelDomId(prefix)}
            tabIndex={selected ? 0 : -1}
            variant={selected ? "primary" : "secondary"}
            className={cn("rounded-4xl", selected && SELECTED_TAB)}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </Button>
        )
      })}
    </div>
  )
}

export { TabBar }
export type { TabItem }
