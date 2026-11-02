import { BrandLogo } from "@/components/shared/brand-logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { useInView } from "@/hooks/use-in-view"
import type { CategoryNode } from "@/lib/category-tree"
import { cn } from "@/lib/utils"
import { CartButton } from "./cart-button"
import { HeaderAccount } from "./header-account"
import { HeaderNav } from "./header-nav"
import type { HeaderSession } from "./header-session"
import { MobileNavDrawer } from "./mobile-nav-drawer"
import { SearchPanel } from "./search-panel"

/**
 * Header cửa hàng, dính khi cuộn. Ở đầu trang nền liền với trang; cuộn quá vài px thì nền mờ nhẹ và hiện đường kẻ mảnh
 * (phát hiện bằng một phần tử mốc cao 8px ở đầu tài liệu, không dùng scroll listener).
 *
 * Từ `lg`: logo, menu danh mục, tìm kiếm, đổi sáng/tối, giỏ hàng, tài khoản. Dưới `lg`: nút menu, logo, tìm kiếm, giỏ hàng;
 * danh mục, tài khoản và đổi sáng/tối nằm trong ngăn kéo (không đủ chỗ ở 360px).
 */
function StorefrontHeader({
  session,
  categories = [],
  onCartClick,
}: {
  session: HeaderSession
  /** Danh mục gốc (đã dựng cây). Chưa có thì menu chỉ còn "Tất cả sản phẩm". */
  categories?: CategoryNode[]
  onCartClick?: () => void
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ initialInView: true })
  const scrolled = !inView

  return (
    <>
      <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-2" />
      <header
        className={cn(
          "sticky top-0 z-30 border-b transition-[background-color,border-color] duration-(--motion-base) ease-smooth",
          scrolled
            ? "border-border-subtle bg-canvas/80 backdrop-blur-md"
            : "border-transparent bg-canvas",
        )}
      >
        <div className="mx-auto flex h-header w-full max-w-7xl items-center gap-2 px-gutter lg:gap-8">
          <MobileNavDrawer categories={categories} session={session} />
          <BrandLogo to="/" />
          <HeaderNav categories={categories} />
          <div className="ml-auto flex items-center gap-1 lg:gap-inline">
            <SearchPanel />
            <div className="max-lg:hidden">
              <ThemeToggle />
            </div>
            <CartButton onClick={onCartClick} />
            <div className="max-lg:hidden">
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
