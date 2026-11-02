import type { ReactNode } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { SkipLink } from "@/components/storefront/skip-link"
import { StorefrontFooter } from "@/components/storefront/storefront-footer"
import { useScrollRestoration } from "@/hooks/use-scroll-restoration"

/**
 * Khung của khu khách: liên kết bỏ qua, header và footer (do container nối phiên và danh mục rồi truyền vào),
 * nội dung. Nằm ngoài `.density-admin` nên dùng mật độ storefront.
 *
 * Hiệu ứng vào trang gắn `key` theo PATHNAME, không theo query: đổi bộ lọc hay đổi trang trong /products không làm
 * cả trang mờ-trồi lại. `scroll-mt-header` để mục tiêu "bỏ qua tới nội dung" không bị header dính che.
 */
function StorefrontLayout({
  header,
  footer = <StorefrontFooter />,
}: {
  header: ReactNode
  footer?: ReactNode
}) {
  const { pathname } = useLocation()
  useScrollRestoration()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SkipLink />
      {header}
      <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-header outline-none">
        <div key={pathname} className="motion-safe:animate-page-enter">
          <Outlet />
        </div>
      </main>
      {footer}
    </div>
  )
}

export { StorefrontLayout }
