import type { KeyboardEvent, MouseEvent, PointerEvent, Ref } from "react"
import { Link } from "react-router-dom"
import type { NavItem } from "@/lib/nav-items"
import { cn } from "@/lib/utils"
import { NAV_TEXT, NAV_UNDERLINE } from "./header-nav-styles"

/**
 * Một mục của thanh điều hướng: luôn là liên kết thật. Mục có bảng (`panelId` khác `undefined`) thêm `aria-haspopup`,
 * `aria-expanded`, `aria-controls`; id bảng chỉ tồn tại khi bảng đang mở của mục đó.
 */
function HeaderNavLink({
  item,
  active,
  panelId,
  expanded,
  ref,
  onClick,
  onKeyDown,
  onFocus,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: {
  item: NavItem
  active: boolean
  panelId?: string
  expanded: boolean
  ref: Ref<HTMLAnchorElement>
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => void
  onFocus: () => void
  onPointerDown: (event: PointerEvent<HTMLAnchorElement>) => void
  onPointerEnter: (event: PointerEvent<HTMLAnchorElement>) => void
  onPointerLeave: (event: PointerEvent<HTMLAnchorElement>) => void
}) {
  return (
    <Link
      ref={ref}
      to={item.href}
      aria-current={active ? "page" : undefined}
      aria-haspopup={panelId ? "true" : undefined}
      aria-expanded={panelId ? expanded : undefined}
      aria-controls={panelId}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={cn("inline-flex min-h-control items-center text-body-sm whitespace-nowrap", NAV_TEXT, NAV_UNDERLINE)}
    >
      {item.label}
    </Link>
  )
}

export { HeaderNavLink }
