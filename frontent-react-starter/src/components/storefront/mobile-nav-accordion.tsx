import { useId } from "react"
import { Link } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { categoryHref, panelRows, type NavItem } from "@/lib/nav-items"
import { cn } from "@/lib/utils"
import { MOBILE_ROW } from "./mobile-nav-styles"

/**
 * Mục danh mục có con trong ngăn kéo, dạng accordion: nút mở/thu gọn (`aria-expanded`, `aria-controls`); bên trong có "Tất cả …" và
 * các danh mục con (cháu thụt vào, chữ nhỏ hơn). Vùng thu gọn là `inert` nên không nhận focus và bị ẩn khỏi trình đọc màn hình.
 * `ancestorActive`: danh mục đang xem nằm trong mục này (nhãn gạch chân; mục tự mở sẵn ở `MobileNavList`).
 */
function MobileNavAccordion({
  item,
  expanded,
  ancestorActive,
  activeSlug,
  onToggle,
  onNavigate,
}: {
  item: NavItem
  expanded: boolean
  ancestorActive: boolean
  activeSlug: string | null
  onToggle: () => void
  onNavigate: () => void
}) {
  const regionId = useId()
  const { node } = item
  if (!node) return null

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={onToggle}
        className={cn(MOBILE_ROW, "justify-between")}
      >
        <span className={cn(ancestorActive && "underline decoration-1 underline-offset-8")}>{item.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 text-ink-muted transition-transform duration-(--motion-fast) ease-smooth", expanded && "rotate-180")}
        />
      </button>
      <div
        id={regionId}
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows] duration-(--motion-base) ease-smooth",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <ul className="min-h-0 overflow-hidden">
          <li>
            <Link
              to={item.href}
              onClick={onNavigate}
              aria-current={activeSlug === node.slug ? "page" : undefined}
              className={cn(MOBILE_ROW, "pl-6", activeSlug === node.slug && "bg-surface-hover")}
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
                className={cn(
                  MOBILE_ROW,
                  level === 1 ? "pl-6" : "pl-10 text-caption",
                  activeSlug === row.slug && "bg-surface-hover",
                )}
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

export { MobileNavAccordion }
