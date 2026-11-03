import { useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { hasPanel, isNavItemActive, type NavItem } from "@/lib/nav-items"
import { cn } from "@/lib/utils"
import { MobileNavAccordion } from "./mobile-nav-accordion"
import { MOBILE_ROW } from "./mobile-nav-styles"

/**
 * Điều hướng trong ngăn kéo (dưới `xl`), cùng cấu hình và thứ tự với thanh điều hướng ở header. Mục danh mục có con là accordion,
 * mỗi lúc mở một mục; mục chứa danh mục đang xem tự mở sẵn. `onNavigate` gọi khi bấm liên kết: bấm đúng đường dẫn đang ở (chỉ đổi
 * `?category=`) thì pathname không đổi nên ngăn kéo phải được đóng bằng tay.
 */
function MobileNavList({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const categorySlug = pathname === "/products" ? searchParams.get("category") || null : null
  const [expandedKey, setExpandedKey] = useState<string | null>(
    () => items.find((item) => hasPanel(item) && isNavItemActive(item, pathname, categorySlug))?.key ?? null,
  )

  return (
    <nav aria-label="Menu chính" className="flex flex-col">
      {items.map((item) => {
        const active = isNavItemActive(item, pathname, categorySlug)
        if (hasPanel(item)) {
          return (
            <MobileNavAccordion
              key={item.key}
              item={item}
              expanded={expandedKey === item.key}
              ancestorActive={active}
              activeSlug={categorySlug}
              onToggle={() => setExpandedKey(expandedKey === item.key ? null : item.key)}
              onNavigate={onNavigate}
            />
          )
        }
        return (
          <Link
            key={item.key}
            to={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(MOBILE_ROW, active && "bg-surface-hover")}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export { MobileNavList }
