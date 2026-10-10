import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  PRESET_OPTIONS,
  fromDateInputValue,
  toDateInputValue,
  type DateRange,
  type RangePreset,
} from "@/lib/date-range"

/**
 * Một hàng bộ lọc duy nhất, đặt trên mọi thứ nó chi phối — không có bộ lọc
 * riêng bên trong từng thẻ.
 *
 * "Tùy chọn" dùng <input type="date"> thay vì thư viện lịch: đi được bằng bàn
 * phím, có sẵn giao diện bản địa, và không thêm phụ thuộc nào.
 */
function DateRangePicker({
  preset,
  customRange,
  onPresetChange,
  onCustomRangeChange,
}: {
  preset: RangePreset
  customRange: DateRange
  onPresetChange: (preset: RangePreset) => void
  onCustomRangeChange: (range: DateRange) => void
}) {
  return (
    <div className="flex flex-col items-start gap-stack md:items-end">
      <div
        role="radiogroup"
        aria-label="Khoảng thời gian"
        className="inline-flex rounded-xs border border-border-default p-0.5"
      >
        {PRESET_OPTIONS.map((option) => {
          const selected = preset === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onPresetChange(option.value)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                event.preventDefault()
                const index = PRESET_OPTIONS.findIndex((item) => item.value === preset)
                const step = event.key === "ArrowRight" ? 1 : -1
                const next = (index + step + PRESET_OPTIONS.length) % PRESET_OPTIONS.length
                onPresetChange(PRESET_OPTIONS[next].value)
              }}
              className={cn(
                "rounded-xs px-3 py-1.5 text-body-sm whitespace-nowrap transition-colors",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "bg-primary text-primary-fg"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink",
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {preset === "custom" ? (
        <div className="flex flex-wrap items-end gap-inline">
          <div className="flex flex-col gap-1">
            <Label htmlFor="range-from" className="text-caption text-ink-muted">
              Từ ngày
            </Label>
            <Input
              id="range-from"
              type="date"
              className="w-40"
              max={toDateInputValue(customRange.to)}
              value={toDateInputValue(customRange.from)}
              onChange={(event) => {
                const from = fromDateInputValue(event.target.value)
                if (from) onCustomRangeChange({ ...customRange, from })
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="range-to" className="text-caption text-ink-muted">
              Đến ngày
            </Label>
            <Input
              id="range-to"
              type="date"
              className="w-40"
              min={toDateInputValue(customRange.from)}
              value={toDateInputValue(customRange.to)}
              onChange={(event) => {
                const to = fromDateInputValue(event.target.value)
                if (to) onCustomRangeChange({ ...customRange, to })
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { DateRangePicker }
