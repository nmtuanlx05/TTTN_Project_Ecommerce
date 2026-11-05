import { Check } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

const STEPS = [
  { label: "Giỏ hàng", href: "/gio-hang" },
  { label: "Thanh toán", href: null },
  { label: "Hoàn tất", href: null },
] as const

/**
 * Thanh các bước đặt hàng, dùng cho /thanh-toan (`current=2`) và /dat-hang-thanh-cong (`current=3`). Bước đã xong: tròn đen có dấu tích;
 * bước hiện tại: tròn viền đậm; chưa tới: nhạt. Bước "Giỏ hàng" là liên kết về /gio-hang. Các bước nối bằng đường mảnh.
 */
function CheckoutSteps({ current }: { current: 2 | 3 }) {
  return (
    <ol aria-label="Các bước đặt hàng" className="mb-8 flex items-center gap-3 text-body-sm">
      {STEPS.map((step, index) => {
        const number = index + 1
        const done = number < current
        const active = number === current
        const circle = (
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-4xl border text-caption font-semibold",
              done && "border-primary bg-primary text-primary-fg",
              active && "border-ink text-ink",
              !done && !active && "border-border-control text-ink-subtle",
            )}
          >
            {done ? <Check className="size-3.5" aria-hidden="true" /> : number}
          </span>
        )
        const label = <span className={cn(active ? "font-semibold text-ink" : "text-ink-muted")}>{step.label}</span>
        return (
          <li key={step.label} aria-current={active ? "step" : undefined} className="flex items-center gap-3">
            {step.href && done ? (
              <Link to={step.href} className="flex items-center gap-2 hover:underline">
                {circle}
                {label}
              </Link>
            ) : (
              <span className="flex items-center gap-2">
                {circle}
                {label}
              </span>
            )}
            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" className="h-px w-8 bg-border-default sm:w-12" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export { CheckoutSteps }
