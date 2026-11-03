import { useLayoutEffect, useRef, type Ref, type RefObject } from "react"
import { Link } from "react-router-dom"
import { categoryHref, panelRows, type NavItem } from "@/lib/nav-items"
import { cn } from "@/lib/utils"
import { NAV_TEXT, NAV_UNDERLINE } from "./header-nav-styles"

/**
 * Căn lề của danh sách trong bảng. Mặc định danh sách căn trái theo mép trái của THANH ĐIỀU HƯỚNG (`--nav-offset` đo trong
 * `HeaderNavPanel`), một cột cố định cho mọi mục nên khi rê từ mục này sang mục khác danh sách không nhảy ngang.
 * Muốn căn giữa sau này thì đổi class này thành `mx-auto`.
 */
const LIST_ALIGN = "ml-(--nav-offset)"

const ROW = "flex min-h-control items-center focus-visible:-outline-offset-2"

/**
 * Bảng toàn chiều rộng ngay dưới header: nền `canvas` đặc, kẻ `border-subtle` trên và dưới, không bóng, không lớp phủ. Cao tối đa
 * 70dvh rồi cuộn bên trong. Nằm trong `<nav>` (không định vị) nên `absolute inset-x-0 top-full` tính theo header dính.
 * `transition-none`: `duration-*` của animate-in còn đặt `transition-duration` nên nếu không tắt thì `margin-left` (căn lề) bị chạy transition.
 * Đổi mục thì chỉ đổi nội dung (`key` trên khối bên trong, mờ dần nhanh), bảng KHÔNG gỡ ra gắn lại nên không nháy.
 */
function HeaderNavPanel({
  item,
  id,
  alignTo,
  activeSlug,
  ref,
  onNavigate,
}: {
  item: NavItem
  id: string
  /** Phần tử mà mép trái danh sách phải thẳng hàng với (thanh điều hướng). */
  alignTo: RefObject<HTMLElement | null>
  activeSlug: string | null
  ref: Ref<HTMLDivElement>
  onNavigate: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Đo trước khi vẽ để lần hiện đầu tiên đã đúng chỗ; đo lại khi đổi cỡ cửa sổ.
  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current
      const anchor = alignTo.current
      if (!container || !anchor) return
      const contentLeft = container.getBoundingClientRect().left + parseFloat(getComputedStyle(container).paddingLeft)
      container.style.setProperty("--nav-offset", `${Math.max(0, anchor.getBoundingClientRect().left - contentLeft)}px`)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [alignTo])

  const { node } = item
  if (!node) return null
  const allActive = activeSlug === node.slug

  return (
    <div
      ref={ref}
      id={id}
      className="absolute inset-x-0 top-full z-40 max-h-[70dvh] overflow-y-auto border-y border-border-subtle bg-canvas transition-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-(--motion-base)"
    >
      <div ref={containerRef} className="mx-auto w-full max-w-7xl px-gutter">
        <ul
          key={item.key}
          aria-label={item.label}
          className={cn("w-max min-w-64 py-4 transition-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-(--motion-fast)", LIST_ALIGN)}
        >
          <li>
            <Link
              to={item.href}
              onClick={onNavigate}
              aria-current={allActive ? "page" : undefined}
              className={cn(ROW, "text-body-sm", NAV_TEXT, NAV_UNDERLINE)}
            >
              Tất cả {item.label}
            </Link>
          </li>
          {panelRows(node).map(({ node: row, level }) => (
            <li key={row.id}>
              <Link
                to={categoryHref(row.slug)}
                onClick={onNavigate}
                aria-current={activeSlug === row.slug ? "page" : undefined}
                className={cn(ROW, NAV_TEXT, NAV_UNDERLINE, level === 1 ? "text-body-sm" : "pl-4 text-caption")}
              >
                {row.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export { HeaderNavPanel }
