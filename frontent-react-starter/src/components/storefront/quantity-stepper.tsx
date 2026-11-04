import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Ô số lượng: nút −/+ và ô nhập số nguyên trong khoảng `min`–`max` (mặc định 1–99). Gõ dở (ô trống, "0") không đổi giá trị thật; gõ quá `max` thì chặn ở `max`;
 * rời ô thì hiện lại giá trị hợp lệ. Giới hạn thật theo tồn kho do server quyết (giỏ hàng).
 *
 * `compact`: dùng trong dòng giỏ hàng. Giá trị chỉ là chữ (không có ô nhập, tránh gửi một yêu cầu cho mỗi phím gõ), thanh cao 44px.
 * `disabled`: khóa các nút (và ô nhập) khi đang gửi.
 */
function QuantityStepper({
  value,
  onChange,
  pill = false,
  compact = false,
  min = 1,
  max = 99,
  disabled = false,
}: {
  value: number
  onChange: (value: number) => void
  /** Dáng viên thuốc cao 50px (trang chi tiết): một khung viền chung bo tròn, nút −/+ không viền. Mặc định giữ dáng cũ. */
  pill?: boolean
  compact?: boolean
  min?: number
  max?: number
  disabled?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const step = (delta: number) => {
    setDraft(null)
    onChange(Math.min(max, Math.max(min, value + delta)))
  }
  const rounded = pill || compact

  return (
    <div
      role="group"
      aria-label="Số lượng"
      className={cn(
        "inline-flex items-center",
        pill && "h-[calc(var(--sp-control-h)+6px)] rounded-4xl border border-border-control px-1",
        compact && "h-control rounded-4xl border border-border-control",
      )}
    >
      <Button
        type="button"
        variant={rounded ? "ghost" : "secondary"}
        size="icon"
        aria-label="Giảm số lượng"
        disabled={disabled || value <= min}
        onClick={() => step(-1)}
        className={cn("press", rounded && "rounded-4xl")}
      >
        <Minus />
      </Button>
      {compact ? (
        <output aria-live="polite" className="w-6 text-center text-body-sm text-ink">
          {value}
        </output>
      ) : (
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Số lượng"
          disabled={disabled}
          value={draft ?? String(value)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 2)
            setDraft(digits)
            const number = Number(digits)
            if (digits !== "" && number >= min) onChange(Math.min(max, number))
          }}
          onBlur={() => setDraft(null)}
          className={cn(
            "h-control bg-transparent text-center text-body text-ink focus-visible:outline-2 focus-visible:outline-ring",
            pill ? "w-8" : "w-14 border-y border-border-control",
          )}
        />
      )}
      <Button
        type="button"
        variant={rounded ? "ghost" : "secondary"}
        size="icon"
        aria-label="Tăng số lượng"
        disabled={disabled || value >= max}
        onClick={() => step(1)}
        className={cn("press", rounded && "rounded-4xl")}
      >
        <Plus />
      </Button>
    </div>
  )
}

export { QuantityStepper }
