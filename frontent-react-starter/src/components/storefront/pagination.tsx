import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const CELL =
  "inline-flex size-control items-center justify-center rounded-xs text-body-sm transition-colors duration-(--motion-fast) ease-smooth"

type Cell = number | "gap-start" | "gap-end"

/** 1 … 4 5 6 … 11: luôn có trang đầu, cuối và một trang mỗi bên trang hiện tại. */
function pageCells(page: number, totalPages: number): Cell[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1])
  const numbers = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  const cells: Cell[] = []
  numbers.forEach((n, index) => {
    const previous = numbers[index - 1]
    if (previous !== undefined && n - previous > 1) cells.push(index < 2 ? "gap-start" : "gap-end")
    cells.push(n)
  })
  return cells
}

/**
 * Phân trang bằng số trang, mỗi trang là một `<Link>` thật (mở tab mới, sao chép liên kết được). Dưới `sm` chỉ còn
 * Trước / "Trang x / y" / Sau cho vừa màn hẹp. `onNavigate` gọi khi bấm trái thường (không phím bổ trợ) để nơi dùng cuộn tới
 * đầu danh sách. Ẩn khi chỉ có một trang.
 */
function Pagination({
  page,
  totalPages,
  hrefFor,
  onNavigate,
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
  onNavigate?: () => void
}) {
  if (totalPages <= 1) return null

  const handleClick = (event: React.MouseEvent) => {
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (plain) onNavigate?.()
  }

  const step = (target: number, label: string, icon: React.ReactNode) =>
    target < 1 || target > totalPages ? (
      <span aria-disabled="true" aria-label={label} className={cn(CELL, "text-ink-subtle opacity-45")}>
        {icon}
      </span>
    ) : (
      <Link to={hrefFor(target)} onClick={handleClick} aria-label={label} className={cn(CELL, "hover:bg-surface-hover")}>
        {icon}
      </Link>
    )

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-1">
      {step(page - 1, "Trang trước", <ChevronLeft className="size-4" />)}
      <p className="px-3 text-body-sm text-ink-muted sm:hidden">
        Trang {page} / {totalPages}
      </p>
      <ul className="hidden items-center gap-1 sm:flex">
        {pageCells(page, totalPages).map((cell) =>
          typeof cell === "string" ? (
            <li key={cell} aria-hidden="true" className={cn(CELL, "text-ink-subtle")}>
              …
            </li>
          ) : (
            <li key={cell}>
              <Link
                to={hrefFor(cell)}
                onClick={handleClick}
                aria-label={`Trang ${cell}`}
                aria-current={cell === page ? "page" : undefined}
                className={cn(CELL, cell === page ? "bg-primary text-primary-fg" : "hover:bg-surface-hover")}
              >
                {cell}
              </Link>
            </li>
          ),
        )}
      </ul>
      {step(page + 1, "Trang sau", <ChevronRight className="size-4" />)}
    </nav>
  )
}

export { Pagination }
