import type { CategoryNode, CategoryTree } from "@/lib/category-tree"
import { containsSlug } from "@/lib/category-tree"
import type { StoreNavItem } from "@/lib/store-info"

/** Mục điều hướng đã đối chiếu với cây danh mục. `node` có giá trị khi mục gắn với một danh mục. */
export interface NavItem {
  /** Ổn định và duy nhất trong một thanh điều hướng (dùng làm `key`, id của bảng). */
  key: string
  label: string
  href: string
  node: CategoryNode | null
}

/** Một dòng trong bảng danh mục con. `level` 1 = con trực tiếp, 2 = cháu. */
export interface PanelRow {
  node: CategoryNode
  level: 1 | 2
}

/** Đường dẫn tới danh sách sản phẩm của một danh mục. */
export function categoryHref(slug: string): string {
  return `/products?category=${encodeURIComponent(slug)}`
}

/**
 * Cấu hình `STORE.navItems` → mục hiển thị, giữ nguyên thứ tự. Mục danh mục mà slug không có trong cây (đang tải, lỗi,
 * hoặc danh mục chưa tồn tại) bị bỏ chứ không tạo liên kết chết.
 */
export function resolveNavItems(config: StoreNavItem[], tree: CategoryTree | null): NavItem[] {
  return config.flatMap((entry): NavItem[] => {
    if ("href" in entry) return [{ key: entry.href, label: entry.label, href: entry.href, node: null }]
    const node = tree?.bySlug.get(entry.categorySlug)
    if (!node) return []
    return [{ key: `category:${node.slug}`, label: entry.label, href: categoryHref(node.slug), node }]
  })
}

/** Mục có danh mục con thì mở bảng; không có con thì là liên kết thường. */
export function hasPanel(item: NavItem): boolean {
  return item.node !== null && item.node.children.length > 0
}

/**
 * Các dòng của bảng: danh mục con rồi cháu ngay dưới cha (theo thứ tự cây, tức theo tên). Tối đa 3 cấp tính cả mục cha,
 * sâu hơn bị bỏ qua.
 */
export function panelRows(node: CategoryNode): PanelRow[] {
  return node.children.flatMap((child) => [
    { node: child, level: 1 as const },
    ...child.children.map((grandchild) => ({ node: grandchild, level: 2 as const })),
  ])
}

/**
 * Mục đang xem. "Tất cả sản phẩm" (`/products`) chỉ đánh dấu khi KHÔNG có `?category=`; khi có thì đánh dấu mục danh mục
 * chứa danh mục đó (chính nó hoặc tổ tiên). Trang chi tiết sản phẩm không đánh dấu mục nào.
 */
export function isNavItemActive(item: NavItem, pathname: string, categorySlug: string | null): boolean {
  if (item.node) return pathname === "/products" && categorySlug !== null && containsSlug(item.node, categorySlug)
  if (item.href === "/products") return pathname === "/products" && categorySlug === null
  return pathname === item.href
}
