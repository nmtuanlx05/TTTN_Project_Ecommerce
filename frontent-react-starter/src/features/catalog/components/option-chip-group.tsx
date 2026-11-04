import type { KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import type { OptionState } from "../variant-options"

interface ChipOption {
  value: string
  state: OptionState
  /** Không có tổ hợp này: không chọn được (`aria-disabled`). */
  disabled: boolean
  /** Chỉ dùng với `variant="swatch"`: mã màu của chấm. Không có thì ô đó rơi về nút chữ. */
  swatch?: string
}

type ChipVariant = "chip" | "swatch" | "pill"

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
/** Đường chéo cho lựa chọn hết hàng/không có: đảo màu theo nền bên dưới (thấy được trên cả chấm đen lẫn trắng), không chỉ dựa vào màu. */
const STRIKE = "pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -rotate-45 bg-canvas mix-blend-difference"

/**
 * Nhóm chọn một giá trị (màu hoặc size), dựng bằng `radiogroup`: Tab vào nhóm (mục đang chọn), mũi tên/Home/End
 * đổi lựa chọn và bỏ qua mục bị vô hiệu hóa. `variant`: `chip` (mặc định) ghi chữ "Hết hàng" trong chip; `pill` (size) và `swatch` (chấm màu) giữ chiều cao cố định,
 * hết hàng thì mờ đi + gạch chéo + `aria-label` "<giá trị>, hết hàng". Hết hàng vẫn chọn được (để thấy trạng thái), không có tổ hợp thì mờ/nét đứt + `aria-disabled`.
 * Mục `swatch` không có mã màu rơi về nút chữ.
 */
function OptionChipGroup({
  labelId,
  options,
  selected,
  onSelect,
  variant = "chip",
}: {
  labelId: string
  options: ChipOption[]
  selected: string
  onSelect: (value: string) => void
  variant?: ChipVariant
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
    // Focus theo lựa chọn mới (mục mới mới có tabIndex 0 sau lần dựng kế tiếp).
    const group = event.currentTarget
    requestAnimationFrame(() => group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      onKeyDown={onKeyDown}
      className={cn("flex flex-wrap", variant === "swatch" ? "-ml-2" : "gap-2")}
    >
      {options.map((option) => {
        const checked = option.value === selected
        const kind = variant === "swatch" && !option.swatch ? "chip" : variant
        const unavailable = option.state !== "available"
        const hint = option.disabled ? "không có" : option.state === "soldout" ? "hết hàng" : null
        const common = {
          type: "button" as const,
          role: "radio",
          "aria-checked": checked,
          "aria-disabled": option.disabled || undefined,
          // Chip đã ghi chữ "Hết hàng" nên không cần nhãn riêng; pill/chấm màu truyền đạt bằng nhãn.
          "aria-label": kind !== "chip" && hint ? `${option.value}, ${hint}` : undefined,
          tabIndex: checked ? 0 : -1,
          onClick: () => {
            if (!option.disabled) onSelect(option.value)
          },
        }

        if (kind === "swatch" && option.swatch) {
          return (
            <button
              key={option.value}
              {...common}
              title={option.value}
              className={cn("press relative grid size-11 place-items-center rounded-4xl", FOCUS)}
            >
              <span
                aria-hidden="true"
                style={{ backgroundColor: option.swatch }}
                className={cn(
                  "relative size-7 overflow-hidden rounded-4xl transition-opacity duration-(--motion-fast) ease-smooth",
                  "border border-ink/15",
                  checked && "outline-2 outline-offset-2 outline-ink",
                  unavailable && "opacity-50",
                )}
              >
                {unavailable ? <span className={STRIKE} /> : null}
              </span>
            </button>
          )
        }

        return (
          <button
            key={option.value}
            {...common}
            className={cn(
              "press relative flex min-h-control min-w-control flex-col items-center justify-center overflow-hidden border px-4 text-body-sm",
              kind === "pill" ? "rounded-4xl" : "rounded-xs",
              "transition-colors duration-(--motion-fast) ease-smooth",
              FOCUS,
              checked
                ? "border-ink bg-primary text-primary-fg"
                : option.disabled
                  ? "cursor-not-allowed border-dashed border-border-default text-ink-subtle"
                  : "border-border-control text-ink hover:border-ink",
              kind === "pill" && unavailable && !checked && "opacity-50",
            )}
          >
            {option.value}
            {kind === "pill" ? (
              unavailable ? (
                <span className={STRIKE} />
              ) : null
            ) : option.state === "available" ? null : (
              <span className="text-caption">Hết hàng</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { OptionChipGroup }
export type { ChipOption }
