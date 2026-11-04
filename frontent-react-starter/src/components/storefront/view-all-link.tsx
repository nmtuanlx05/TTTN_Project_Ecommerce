import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

/** Liên kết phụ cạnh tiêu đề khối ("Xem tất cả →"): gạch chân, cao ≥ 44px. */
function ViewAllLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-control items-center gap-2 text-body-sm font-medium text-ink underline underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth hover:text-ink-muted"
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  )
}

export { ViewAllLink }
