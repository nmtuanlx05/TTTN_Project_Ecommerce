import { Link } from "react-router-dom"
import type { CategoryNode } from "@/lib/category-tree"
import { cn } from "@/lib/utils"

/** Hover/focus: chữ đổi sang `ink` và gạch chân (không chỉ đổi màu). Viền focus vẽ vào trong vì bảng có `overflow` cuộn. */
const ROW =
  "flex min-h-control items-center underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) ease-smooth " +
  "text-ink-muted hover:text-ink hover:decoration-ink focus-visible:text-ink focus-visible:decoration-ink focus-visible:-outline-offset-2"

const INDENT = ["px-4 text-body-sm", "pr-4 pl-8 text-caption", "pr-4 pl-12 text-caption"] as const

function Branch({
  nodes,
  activeSlug,
  onNavigate,
}: {
  nodes: CategoryNode[]
  activeSlug: string | null
  onNavigate: () => void
}) {
  return (
    <ul>
      {nodes.map((node) => {
        const active = activeSlug === node.slug
        return (
          <li key={node.id}>
            <Link
              to={`/products?category=${encodeURIComponent(node.slug)}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(ROW, INDENT[Math.min(node.depth, INDENT.length - 1)], active && "font-semibold text-ink decoration-ink")}
            >
              {node.name}
            </Link>
            {/* Danh mục con hiện ngay dưới danh mục cha, thụt vào, cùng lúc (không có menu con bay sang bên cạnh). */}
            {node.children.length > 0 ? (
              <Branch nodes={node.children} activeSlug={activeSlug} onNavigate={onNavigate} />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Nội dung bảng thả xuống của menu danh mục: "Xem tất cả sản phẩm", rồi toàn bộ cây danh mục theo chiều dọc. Mục đang xem có
 * `aria-current`, chữ đậm và gạch chân. `onNavigate` gọi khi bấm một liên kết (đóng bảng cả khi chỉ đổi `?category=`).
 */
function HeaderNavPanel({
  categories,
  activeSlug,
  allActive,
  onNavigate,
}: {
  categories: CategoryNode[]
  activeSlug: string | null
  /** Đang ở /products không lọc danh mục. */
  allActive: boolean
  onNavigate: () => void
}) {
  return (
    <ul>
      <li>
        <Link
          to="/products"
          onClick={onNavigate}
          aria-current={allActive ? "page" : undefined}
          className={cn(ROW, INDENT[0], "font-medium", allActive && "font-semibold text-ink decoration-ink")}
        >
          Xem tất cả sản phẩm
        </Link>
      </li>
      <li>
        <Branch nodes={categories} activeSlug={activeSlug} onNavigate={onNavigate} />
      </li>
    </ul>
  )
}

export { HeaderNavPanel }
