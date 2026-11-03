import { useMemo } from "react"
import { BrandLogo } from "@/components/shared/brand-logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { useInView } from "@/hooks/use-in-view"
import type { CategoryTree } from "@/lib/category-tree"
import { resolveNavItems } from "@/lib/nav-items"
import { STORE } from "@/lib/store-info"
import { cn } from "@/lib/utils"
import { CartButton } from "./cart-button"
import { HeaderAccount } from "./header-account"
import { HeaderNav } from "./header-nav"
import type { HeaderSession } from "./header-session"
import { MobileNavDrawer } from "./mobile-nav-drawer"
import { SearchPanel } from "./search-panel"

/**
 * Header cửa hàng, dính khi cuộn. Ở đầu trang nền liền với trang; cuộn quá vài px thì nền mờ nhẹ và hiện đường kẻ mảnh
 * (phát hiện bằng một phần tử mốc cao 8px, đặt ngay dưới thanh thông báo ở đầu tài liệu — tức đúng chỗ header đang nằm khi chưa dính —
 * không dùng scroll listener).
 *
 * Từ `xl` (1280px): logo bên trái; thanh điều hướng (`STORE.navItems`) và nhóm biểu tượng (tìm kiếm, đổi sáng/tối, giỏ hàng, tài khoản)
 * gom về bên phải, thanh điều hướng cách nhóm biểu tượng 40px. Dưới `xl`: nút menu, logo, tìm kiếm, giỏ hàng; điều hướng, tài khoản
 * và đổi sáng/tối nằm trong ngăn kéo (thanh điều hướng đầy đủ không vừa ở 1024px).
 */
function StorefrontHeader({
  session,
  categoryTree = null,
  onCartClick,
}: {
  session: HeaderSession
  /** Cây danh mục. Chưa có (đang tải hoặc lỗi) thì các mục danh mục ẩn, chỉ còn mục liên kết thường. */
  categoryTree?: CategoryTree | null
  onCartClick?: () => void
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ initialInView: true })
  const scrolled = !inView
  const navItems = useMemo(() => resolveNavItems(STORE.navItems, categoryTree), [categoryTree])

  return (
    <>
      <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-announcement h-2" />
      <header
        className={cn(
          "sticky top-0 z-30 border-b transition-[background-color,border-color] duration-(--motion-base) ease-smooth",
          scrolled
            ? "border-border-subtle bg-canvas/80 backdrop-blur-md"
            : "border-transparent bg-canvas",
        )}
      >
        <div className="mx-auto flex h-header w-full max-w-7xl items-center gap-2 px-gutter xl:gap-0">
          <MobileNavDrawer items={navItems} session={session} />
          <BrandLogo to="/" />
          <HeaderNav items={navItems} className="ml-auto max-xl:hidden xl:flex" />
          <div className="ml-auto flex items-center gap-1 xl:ml-10 xl:gap-inline">
            <SearchPanel />
            <div className="max-xl:hidden">
              <ThemeToggle />
            </div>
            <CartButton onClick={onCartClick} />
            <div className="max-xl:hidden">
              <HeaderAccount session={session} />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export { StorefrontHeader }
export type { HeaderSession }
