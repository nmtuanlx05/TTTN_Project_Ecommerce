import type { KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import type { OptionState } from "../variant-options"

interface ChipOption {
  value: string
  state: OptionState
  /** Không có tổ hợp này: không chọn được (`aria-disabled`). */
  disabled: boolean
}

/**
 * Nhóm chip chọn một giá trị (màu hoặc size), dựng bằng `radiogroup`: Tab vào nhóm (chip đang chọn), mũi tên/Home/End
 * đổi lựa chọn và bỏ qua chip bị vô hiệu hóa. Hết hàng hoặc không có tổ hợp đều ghi bằng CHỮ "Hết hàng" trong chip; chip hết
 * hàng vẫn chọn được (để thấy trạng thái), chip không có tổ hợp thì viền nét đứt + `aria-disabled`.
 */
function OptionChipGroup({
  labelId,
  options,
  selected,
  onSelect,
}: {
  labelId: string
  options: ChipOption[]
  selected: string
  onSelect: (value: string) => void
}) {
  const enabled = options.filter((option) => !option.disabled)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"]
    if (!keys.includes(event.key) || enabled.length === 0) return
    event.preventDefault()
    const index = enabled.findIndex((option) => option.value === selected)
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown"
    const next =
      event.key === "Home"
        ? enabled[0]
        : event.key === "End"
          ? enabled[enabled.length - 1]
          : enabled[(index + (forward ? 1 : -1) + enabled.length) % enabled.length]
    onSelect(next.value)
    // Focus theo lựa chọn mới (chip mới mới có tabIndex 0 sau lần dựng kế tiếp).
    const group = event.currentTarget
    requestAnimationFrame(() => group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
  }

  return (
    <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = option.value === selected
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            tabIndex={checked ? 0 : -1}
            onClick={() => {
              if (!option.disabled) onSelect(option.value)
            }}
            className={cn(
              "press flex min-h-control min-w-control flex-col items-center justify-center rounded-xs border px-4 py-1 text-body-sm outline-none",
              "transition-colors duration-(--motion-fast) ease-smooth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              checked
                ? "border-ink bg-primary text-primary-fg"
                : option.disabled
                  ? "cursor-not-allowed border-dashed border-border-default text-ink-subtle"
                  : "border-border-control text-ink hover:border-ink",
            )}
          >
            {option.value}
            {option.state === "available" ? null : <span className="text-caption">Hết hàng</span>}
          </button>
        )
      })}
    </div>
  )
}

export { OptionChipGroup }
export type { ChipOption }
