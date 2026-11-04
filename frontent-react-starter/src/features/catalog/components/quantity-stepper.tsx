import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QUANTITY_MAX, QUANTITY_MIN } from "../constants"

/**
 * Ô số lượng: nút −/+ và ô nhập số nguyên, 1–99. Gõ dở (ô trống, "0") không đổi giá trị thật; rời ô thì hiện lại giá trị
 * hợp lệ. Giới hạn thật theo tồn kho do server quyết ở bước giỏ hàng.
 */
function QuantityStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const step = (delta: number) => {
    setDraft(null)
    onChange(Math.min(QUANTITY_MAX, Math.max(QUANTITY_MIN, value + delta)))
  }

  return (
    <div role="group" aria-label="Số lượng" className="inline-flex items-center">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Giảm số lượng"
        disabled={value <= QUANTITY_MIN}
        onClick={() => step(-1)}
        className="press"
      >
        <Minus />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label="Số lượng"
        value={draft ?? String(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 2)
          setDraft(digits)
          const number = Number(digits)
          if (digits !== "" && number >= QUANTITY_MIN) onChange(number)
        }}
        onBlur={() => setDraft(null)}
        className="h-control w-14 border-y border-border-control bg-transparent text-center text-body text-ink focus-visible:outline-2 focus-visible:outline-ring"
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Tăng số lượng"
        disabled={value >= QUANTITY_MAX}
        onClick={() => step(1)}
        className="press"
      >
        <Plus />
      </Button>
    </div>
  )
}

export { QuantityStepper }
