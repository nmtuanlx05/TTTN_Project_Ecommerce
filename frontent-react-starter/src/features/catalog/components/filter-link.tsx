import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/**
 * Một lựa chọn lọc, là liên kết `replace` (đổi lọc không thêm dòng lịch sử). Mục đang chọn khác bằng vạch bên trái +
 * chữ đậm + `aria-current`, không chỉ bằng màu. `indent`: thụt lề cho danh mục con.
 */
function FilterLink({
  to,
  active,
  indent = false,
  children,
}: {
  to: string
  active: boolean
  indent?: boolean
  children: ReactNode
}) {
  return (
    <Link
      replace
      to={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex min-h-control items-center border-l-2 pl-3 text-body-sm transition-colors duration-(--motion-fast) ease-smooth hover:text-ink",
        indent && "ml-4",
        active ? "border-ink font-semibold text-ink" : "border-transparent text-ink-muted",
      )}
    >
      {children}
    </Link>
  )
}

export { FilterLink }
