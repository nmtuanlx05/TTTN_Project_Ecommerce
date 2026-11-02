import { Fragment } from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  /** Bỏ trống ở mục cuối (trang hiện tại). */
  to?: string
}

/** Đường dẫn trang. Mục cuối là trang hiện tại (`aria-current`), không phải liên kết; tên dài thì cắt bằng dấu "…". */
function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Đường dẫn trang">
      <ol className="flex flex-wrap items-center gap-x-1 text-body-sm text-ink-muted">
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
                <span aria-current="page" className="block max-w-56 truncate text-ink sm:max-w-md">
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
