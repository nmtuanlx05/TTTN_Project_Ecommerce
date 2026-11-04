import { Link } from "react-router-dom"
import { STORE } from "@/lib/store-info"
import { cn } from "@/lib/utils"

const WORDMARK = "shrink-0 whitespace-nowrap font-display text-body font-bold uppercase tracking-[0.08em] text-ink sm:tracking-[0.12em] md:text-body-lg"

/**
 * Logo chữ của cửa hàng. Có `to` thì là liên kết (vùng bấm ≥ 44px); không có thì chỉ là chữ
 * (màn hình chờ, nơi không có chỗ để đi tiếp).
 */
function BrandLogo({ to, className }: { to?: string; className?: string }) {
  if (!to) return <span className={cn(WORDMARK, className)}>{STORE.name}</span>

  return (
    <Link
      to={to}
      aria-label={`${STORE.name}, về trang chủ`}
      className={cn(
        WORDMARK,
        "inline-flex min-h-control items-center rounded-xs",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {STORE.name}
    </Link>
  )
}

export { BrandLogo }
