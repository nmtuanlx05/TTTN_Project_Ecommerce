import { Link, useLocation, useSearchParams } from "react-router-dom"
import type { CategoryNode } from "@/lib/category-tree"
import { cn } from "@/lib/utils"

const INDENT = ["", "pl-4", "pl-8"] as const

const ITEM =
  "flex min-h-control items-center rounded-xs px-3 text-body-sm transition-colors duration-(--motion-fast) ease-smooth hover:bg-surface-hover"

function CategoryLinks({
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
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            to={`/products?category=${encodeURIComponent(node.slug)}`}
            onClick={onNavigate}
            aria-current={activeSlug === node.slug ? "page" : undefined}
            className={cn(
              ITEM,
              INDENT[Math.min(node.depth, INDENT.length - 1)],
              node.depth === 0 ? "font-medium text-ink" : "text-ink-muted",
              activeSlug === node.slug && "bg-surface-hover text-ink",
            )}
          >
            {node.name}
          </Link>
          {node.children.length > 0 ? (
            <CategoryLinks nodes={node.children} activeSlug={activeSlug} onNavigate={onNavigate} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * Danh mục trong ngăn kéo menu (đủ mọi cấp, thụt lề). `onNavigate` gọi khi bấm liên kết: bấm đúng đường dẫn
 * đang ở (chỉ đổi `?category=`) thì pathname không đổi nên ngăn kéo phải được đóng bằng tay.
 */
function MobileCategoryList({
  categories,
  onNavigate,
}: {
  categories: CategoryNode[]
  onNavigate: () => void
}) {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const onShop = pathname === "/products"
  const activeSlug = onShop ? searchParams.get("category") : null

  return (
    <nav aria-label="Danh mục" className="flex flex-col">
      <Link
        to="/products"
        onClick={onNavigate}
        aria-current={onShop && !activeSlug ? "page" : undefined}
        className={cn(ITEM, "font-medium text-ink", onShop && !activeSlug && "bg-surface-hover")}
      >
        Tất cả sản phẩm
      </Link>
      <CategoryLinks nodes={categories} activeSlug={activeSlug} onNavigate={onNavigate} />
    </nav>
  )
}

export { MobileCategoryList }
