import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { useMegaMenu } from "@/hooks/use-mega-menu"
import { hasPanel, isNavItemActive, type NavItem } from "@/lib/nav-items"
import { cn } from "@/lib/utils"
import { HeaderNavLink } from "./header-nav-link"
import { HeaderNavPanel } from "./header-nav-panel"

/**
 * Thanh điều hướng của header từ `xl` (dưới `xl` dùng ngăn kéo `MobileNavDrawer`). Mỗi mục là liên kết thật; mục có danh mục con
 * mở một bảng toàn chiều rộng (`HeaderNavPanel`) dùng chung cho mọi mục.
 *
 * Tự dựng bằng `useMegaMenu` thay vì `@base-ui/react` NavigationMenu: ở đây chữ phải là liên kết điều hướng chứ không phải nút mở,
 * chạm lần đầu chỉ mở bảng (lần hai mới đi), và bảng phải căn theo mép thanh điều hướng thay vì theo từng mục. Trigger của
 * NavigationMenu là một nút nên không thỏa cả ba.
 *
 * - Chuột: rê vào mục có bảng thì mở sau 100ms, rời cả vùng (mục + bảng) thì đóng sau 150ms. Bảng là CON của `<nav>` và dính liền
 *   dưới header nên không có khe hở khi rê từ mục xuống bảng. Bấm mục thì đi tới liên kết.
 * - Bàn phím: Enter đi tới liên kết; ↓ mở và vào dòng đầu; ↑/↓/Home/End di chuyển (↑ ở dòng đầu về mục cha); Esc đóng và trả focus
 *   về mục cha; Tab ra khỏi menu thì đóng.
 * - Cảm ứng: chạm lần đầu vào mục có bảng thì mở (không đi), chạm lần hai hoặc chạm "Tất cả …" mới đi; chạm ra ngoài thì đóng.
 */
function HeaderNav({ items, className }: { items: NavItem[]; className?: string }) {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  // Chỉ ở /products thì `?category=` mới là danh mục đang xem.
  const categorySlug = pathname === "/products" ? searchParams.get("category") || null : null
  const navRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())
  const pointerType = useRef("mouse")
  const focusPanelOnOpen = useRef(false)
  const baseId = useId()
  const menu = useMegaMenu(navRef)
  const { closeNow } = menu

  const openItem = items.find((item) => item.key === menu.openKey && hasPanel(item)) ?? null
  const openKey = openItem?.key ?? null
  const panelId = (key: string) => `${baseId}-${key}`

  const panelLinks = () => [...(panelRef.current?.querySelectorAll<HTMLElement>("a") ?? [])]

  // ↓ trên một mục: bảng mới dựng ở lần render kế tiếp, nên chờ rồi mới đưa focus vào dòng đầu.
  useLayoutEffect(() => {
    if (!openKey || !focusPanelOnOpen.current) return
    focusPanelOnOpen.current = false
    panelLinks()[0]?.focus()
  }, [openKey])

  // Esc đóng ngay cả khi bảng mở bằng chuột (focus đang ở chỗ khác); chỉ trả focus về mục cha khi focus đang trong menu.
  useEffect(() => {
    if (!openKey) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return
      const focusInside = navRef.current?.contains(document.activeElement) ?? false
      closeNow()
      if (focusInside) linkRefs.current.get(openKey)?.focus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [openKey, closeNow])

  const onPanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const links = panelLinks()
    const index = links.indexOf(document.activeElement as HTMLElement)
    if (index === -1) return
    const focusAt = (next: number) => links[(next + links.length) % links.length]?.focus()
    const toParent = () => (openKey ? linkRefs.current.get(openKey)?.focus() : undefined)
    if (event.key === "ArrowDown") focusAt(index + 1)
    else if (event.key === "ArrowUp") {
      if (index === 0) toParent()
      else focusAt(index - 1)
    }
    else if (event.key === "Home") focusAt(0)
    else if (event.key === "End") focusAt(-1)
    else if (event.key === "Tab" && event.shiftKey && index === 0) toParent()
    else return
    event.preventDefault()
  }

  return (
    <nav
      ref={navRef}
      aria-label="Điều hướng chính"
      className={cn("h-header items-center", className)}
      onKeyDown={onPanelKeyDown}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") menu.cancelClose()
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") menu.closeSoon()
      }}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) closeNow()
      }}
    >
      <ul className="flex items-center gap-8">
        {items.map((item) => {
          const withPanel = hasPanel(item)
          return (
            <li key={item.key}>
              <HeaderNavLink
                ref={(element) => {
                  if (element) linkRefs.current.set(item.key, element)
                  else linkRefs.current.delete(item.key)
                }}
                item={item}
                active={isNavItemActive(item, pathname, categorySlug)}
                panelId={withPanel ? panelId(item.key) : undefined}
                expanded={openKey === item.key}
                onPointerDown={(event) => {
                  pointerType.current = event.pointerType
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return
                  if (withPanel) menu.openSoon(item.key)
                  else if (openKey) menu.closeSoon()
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") menu.cancelOpen()
                }}
                onFocus={() => {
                  // Tab sang mục khác thì bảng của mục trước phải đóng; con trỏ làm focus nhảy thì không đụng.
                  if (pointerType.current === "keyboard" && openKey && openKey !== item.key) closeNow()
                }}
                onKeyDown={(event) => {
                  pointerType.current = "keyboard"
                  if (event.key !== "ArrowDown" || !withPanel) return
                  event.preventDefault()
                  if (openKey === item.key) panelLinks()[0]?.focus()
                  else {
                    focusPanelOnOpen.current = true
                    menu.openNow(item.key)
                  }
                }}
                onClick={(event) => {
                  const touch = pointerType.current === "touch" || pointerType.current === "pen"
                  if (withPanel && touch && openKey !== item.key) {
                    // Chạm lần đầu: chỉ mở bảng, chưa đi.
                    event.preventDefault()
                    menu.openNow(item.key)
                    return
                  }
                  closeNow()
                }}
              />
            </li>
          )
        })}
      </ul>
      {openItem ? (
        <HeaderNavPanel
          ref={panelRef}
          item={openItem}
          id={panelId(openItem.key)}
          alignTo={navRef}
          activeSlug={categorySlug}
          onNavigate={closeNow}
        />
      ) : null}
    </nav>
  )
}

export { HeaderNav }
