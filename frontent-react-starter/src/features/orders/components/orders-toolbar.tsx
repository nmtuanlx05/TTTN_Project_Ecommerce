import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { GROUP_LABEL, MAX_QUERY_LENGTH, ORDER_GROUPS, type OrderGroup } from "../constants"
import type { OrdersSummary } from "../types"

const SEARCH_DEBOUNCE_MS = 400

const PILL =
  "inline-flex min-h-control shrink-0 items-center gap-1.5 rounded-4xl border px-4 text-body-sm font-medium whitespace-nowrap transition-colors duration-(--motion-fast) ease-smooth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/** Ô tìm theo mã đơn: debounce 400ms, Enter chạy ngay; URL đổi từ ngoài (Back, xóa bộ lọc) thì ô tự theo. */
function OrderSearch({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const [text, setText] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)

  if (value !== previousValue) {
    setPreviousValue(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) return
    const timer = setTimeout(() => onSearch(text), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value, onSearch])

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(text)
      }}
      className="relative min-w-0 lg:w-64"
    >
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted" />
      <Input
        type="search"
        value={text}
        maxLength={MAX_QUERY_LENGTH}
        onChange={(event) => setText(event.target.value)}
        placeholder="Tìm theo mã đơn"
        aria-label="Tìm theo mã đơn"
        className="rounded-4xl bg-surface-raised pl-10"
      />
    </form>
  )
}

/**
 * Thanh lọc: nút thuốc có số đếm (nhóm nút `aria-pressed`) + ô tìm. Từ `lg` cùng một hàng; dưới `lg` nút cuộn ngang một hàng
 * và ô tìm xuống dưới chiếm cả chiều rộng. Số đếm từ `/orders/summary`, không phụ thuộc từ khóa; chưa tải xong thì không hiện số.
 */
function OrdersToolbar({
  group,
  q,
  summary,
  onGroupChange,
  onSearch,
}: {
  group: OrderGroup | undefined
  q: string
  summary: OrdersSummary | undefined
  onGroupChange: (group: OrderGroup | undefined) => void
  onSearch: (value: string) => void
}) {
  const items: { key: OrderGroup | undefined; label: string; count: number | undefined }[] = [
    { key: undefined, label: "Tất cả", count: summary?.total },
    ...ORDER_GROUPS.map((key) => ({ key, label: GROUP_LABEL[key], count: summary?.[key] })),
  ]
  return (
    <div className="flex flex-col gap-3 rounded-panel bg-surface-sunken/50 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div role="group" aria-label="Lọc theo trạng thái" className="scrollbar-soft -m-1 flex gap-2 overflow-x-auto p-1">
        {items.map(({ key, label, count }) => {
          const pressed = key === group
          return (
            <button
              key={label}
              type="button"
              aria-pressed={pressed}
              onClick={() => onGroupChange(key)}
              className={cn(
                PILL,
                pressed
                  ? "border-transparent bg-primary text-primary-fg"
                  : "border-border-default bg-surface-raised text-ink hover:bg-surface-hover",
              )}
            >
              {label}
              {count !== undefined ? (
                <span data-numeric className={pressed ? "text-primary-fg/80" : "text-ink-muted"}>
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <OrderSearch value={q} onSearch={onSearch} />
    </div>
  )
}

export { OrdersToolbar }
