import { useEffect, useId, useRef, type KeyboardEvent } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { useOpenUntilNavigation } from "@/hooks/use-open-until-navigation"
import type { CategoryNode } from "@/lib/category-tree"
import { cn } from "@/lib/utils"
import { HeaderNavPanel } from "./header-nav-panel"

const OPEN_DELAY_MS = 100
const CLOSE_DELAY_MS = 150

/**
 * Menu của header từ `lg`: MỘT mục "Tất cả sản phẩm" (liên kết tới /products) + nút mũi tên mở bảng thả xuống liệt kê cây danh mục
 * theo chiều dọc (`HeaderNavPanel`). Dưới `lg` dùng ngăn kéo (`MobileNavDrawer`), không qua đây.
 *
 * Tự dựng bằng state + hẹn giờ thay vì `@base-ui/react` NavigationMenu/Popover: cả hai coi trigger là MỘT nút, trong khi ở đây chữ phải
 * là liên kết thật và mũi tên là nút riêng (aria-expanded/aria-controls); hover-open của Popover chỉ gắn vào trigger và popup nằm ở
 * Portal nên rê chéo từ nút xuống bảng dễ có khe hở. Ở đây bảng là CON của vùng hover, vùng hover cao đúng bằng header nên bảng
 * liền sát, không có khe.
 *
 * - Chuột (pointerType mouse): mở sau 100ms, đóng sau 150ms khi rời. Cảm ứng không có hover nên mở bằng chạm vào mũi tên.
 * - Bàn phím: Enter/Space trên mũi tên bật/tắt; ↓ từ mũi tên mở và vào bảng; ↑/↓/Home/End di chuyển; Esc đóng và trả focus về mũi tên;
 *   Tab ra ngoài thì đóng.
 * - Đóng khi chọn liên kết, đổi pathname (`useOpenUntilNavigation`), bấm ra ngoài, Esc.
 * - Chưa có danh mục (đang tải hoặc lỗi): chỉ còn liên kết "Tất cả sản phẩm", không mũi tên, không bảng.
 */
function HeaderNav({ categories }: { categories: CategoryNode[] }) {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useOpenUntilNavigation()
  const panelId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const onShop = pathname === "/products"
  const activeSlug = onShop ? searchParams.get("category") : null
  const allActive = onShop && !activeSlug
  const hasPanel = categories.length > 0

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Bấm ra ngoài thì đóng (chạm trên màn hình cảm ứng cũng đi qua đây).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, setOpen])

  const schedule = (next: boolean, delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), delay)
  }

  const focusLink = (index: number) => {
    const links = panelRef.current?.querySelectorAll<HTMLElement>("a") ?? []
    links[(index + links.length) % links.length]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasPanel) return
    if (event.key === "Escape" && open) {
      event.preventDefault()
      window.clearTimeout(timer.current)
      setOpen(false)
      buttonRef.current?.focus()
      return
    }
    const fromButton = event.target === buttonRef.current
    if (event.key === "ArrowDown" && fromButton) {
      event.preventDefault()
      window.clearTimeout(timer.current)
      setOpen(true)
      // Bảng mới dựng ở lần render kế tiếp: chờ rồi mới focus dòng đầu.
      requestAnimationFrame(() => focusLink(0))
      return
    }
    const links = [...(panelRef.current?.querySelectorAll<HTMLElement>("a") ?? [])]
    const index = links.indexOf(document.activeElement as HTMLElement)
    if (index === -1) return
    if (event.key === "ArrowDown") focusLink(index + 1)
    else if (event.key === "ArrowUp") {
      if (index === 0) buttonRef.current?.focus()
      else focusLink(index - 1)
    } else if (event.key === "Home") focusLink(0)
    else if (event.key === "End") focusLink(-1)
    else return
    event.preventDefault()
  }

  return (
    <nav aria-label="Danh mục" className="hidden lg:flex">
      <div
        ref={wrapperRef}
        onKeyDown={onKeyDown}
        onPointerEnter={(event) => {
          if (hasPanel && event.pointerType === "mouse") schedule(true, OPEN_DELAY_MS)
        }}
        onPointerLeave={(event) => {
          if (hasPanel && event.pointerType === "mouse") schedule(false, CLOSE_DELAY_MS)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
        }}
        className="relative flex h-header items-center"
      >
        <Link
          to="/products"
          aria-current={allActive ? "page" : undefined}
          className={cn(
            "inline-flex min-h-control items-center text-body-sm text-ink-muted underline decoration-transparent decoration-1 underline-offset-8 transition-colors duration-(--motion-fast) ease-smooth hover:text-ink hover:decoration-ink",
            allActive && "text-ink decoration-ink",
          )}
        >
          Tất cả sản phẩm
        </Link>
        {hasPanel ? (
          <>
            <button
              ref={buttonRef}
              type="button"
              aria-label="Danh mục sản phẩm"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => {
                window.clearTimeout(timer.current)
                setOpen(!open)
              }}
              className="press inline-flex size-control items-center justify-center text-ink-muted transition-colors duration-(--motion-fast) hover:text-ink"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn("size-4 transition-transform duration-(--motion-fast) ease-smooth", open && "rotate-180")}
              />
            </button>
            {open ? (
              <div
                ref={panelRef}
                id={panelId}
                tabIndex={-1}
                className="absolute top-full left-0 z-40 max-h-[calc(100dvh-var(--header-h)-2rem)] w-64 overflow-y-auto rounded-md border border-border-subtle bg-canvas py-2 outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-(--motion-base)"
              >
                <HeaderNavPanel
                  categories={categories}
                  activeSlug={activeSlug}
                  allActive={allActive}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </nav>
  )
}

export { HeaderNav }
