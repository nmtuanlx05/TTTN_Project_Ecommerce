import { Fragment } from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  /** Bỏ trống ở mục cuối (trang hiện tại). */
  to?: string
}

/** Đường dẫn trang. `subtle`: chữ nhỏ (`text-caption`) và mục cuối nhạt `ink-muted` (trang chi tiết). Mục cuối là trang hiện tại (`aria-current`), không phải liên kết; tên dài thì cắt bằng dấu "…". */
function Breadcrumbs({ items, subtle = false }: { items: BreadcrumbItem[]; subtle?: boolean }) {
  return (
    <nav aria-label="Đường dẫn trang">
      <ol className={cn("flex flex-wrap items-center gap-x-1 text-ink-muted", subtle ? "text-caption" : "text-body-sm")}>
        {items.map((item, index) => (
          <Fragment key={`${index}-${item.label}`}>
            {index > 0 ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-subtle" /> : null}
            <li className="min-w-0">
              {item.to ? (
                <Link
                  to={item.to}
                  className="inline-flex min-h-control items-center max-md:min-w-control max-md:justify-center underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth hover:text-ink hover:decoration-ink"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className={cn("block max-w-56 truncate sm:max-w-md", subtle ? "text-ink-muted" : "text-ink")}>
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

export { Breadcrumbs }
export type { BreadcrumbItem }
