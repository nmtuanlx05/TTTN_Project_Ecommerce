import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

const WORDMARK = "shrink-0 whitespace-nowrap font-display text-body font-bold uppercase tracking-[0.08em] text-ink sm:tracking-[0.12em] md:text-body-lg"

/**
 * Logo chữ của cửa hàng. Có `to` thì là liên kết (vùng bấm ≥ 44px); không có thì chỉ là chữ
 * (màn hình chờ, nơi không có chỗ để đi tiếp).
 */
function BrandLogo({ to, className }: { to?: string; className?: string }) {
  if (!to) return <span className={cn(WORDMARK, className)}>MONO STUDIO</span>

  return (
    <Link
      to={to}
      aria-label="MONO STUDIO, về trang chủ"
      className={cn(
        WORDMARK,
        "inline-flex min-h-control items-center rounded-xs outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      MONO STUDIO
    </Link>
  )
}

export { BrandLogo }
