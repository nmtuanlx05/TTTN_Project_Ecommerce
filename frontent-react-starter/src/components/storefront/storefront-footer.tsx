import { Link } from "react-router-dom"
import { BrandLogo } from "@/components/shared/brand-logo"
import type { CategoryNode } from "@/lib/category-tree"
import { STORE } from "@/lib/store-info"

const LINK =
  "inline-flex min-h-control min-w-control items-center text-body-sm text-ink-muted underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth hover:text-ink hover:decoration-ink"

/**
 * Chân trang: tên + khẩu hiệu, liên kết danh mục (gốc), vùng liên hệ. Thông tin liên hệ chưa có thì hiện
 * dòng "đang được cập nhật" thay vì bịa; điền ở `lib/store-info.ts`. Không có cam kết kinh doanh nào ở đây.
 */
function StorefrontFooter({ categories = [] }: { categories?: CategoryNode[] }) {
  const { contact } = STORE
  const contactLines = [contact.address, contact.phone, contact.email, contact.hours].filter(
    (line): line is string => Boolean(line),
  )

  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto w-full max-w-7xl px-gutter pt-12 pb-8 lg:pt-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <BrandLogo />
            <p className="max-w-xs text-body-sm text-ink-muted">{STORE.tagline}</p>
          </div>

          <nav aria-label="Danh mục ở chân trang" className="flex flex-col items-start">
            <h2 className="mb-1 text-overline uppercase text-ink">Cửa hàng</h2>
            <Link to="/products" className={LINK}>
              Tất cả sản phẩm
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${encodeURIComponent(category.slug)}`}
                className={LINK}
              >
                {category.name}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-1">
            <h2 className="mb-1 text-overline uppercase text-ink">Liên hệ</h2>
            {contactLines.length > 0 ? (
              contactLines.map((line) => (
                <p key={line} className="text-body-sm text-ink-muted">
                  {line}
                </p>
              ))
            ) : (
              <p className="text-body-sm text-ink-muted">{STORE.contactPending}</p>
            )}
          </div>
        </div>

        <p className="mt-12 border-t border-border-subtle pt-6 text-caption text-ink-muted">
          © {new Date().getFullYear()} {STORE.name}
        </p>
      </div>
    </footer>
  )
}

export { StorefrontFooter }
