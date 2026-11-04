import type { CategoryTree } from "@/lib/category-tree"

/** Trang danh sách sản phẩm (không lọc). */
const ALL_PRODUCTS_HREF = "/products"

/** Danh mục `slug` có trong cây không (cây chưa có = chưa biết = coi như không). */
export function hasCategory(tree: CategoryTree | null, slug: string | undefined): slug is string {
  return Boolean(slug && tree?.bySlug.has(slug))
}

/**
 * Đích của nút trang chủ: có slug và danh mục tồn tại thì `/products?category=<slug>` (đúng cách trang danh sách đọc tham số),
 * không thì `/products`, không bao giờ tạo liên kết tới danh mục không có.
 */
export function homeHref(tree: CategoryTree | null, slug?: string): string {
  return hasCategory(tree, slug) ? `${ALL_PRODUCTS_HREF}?category=${encodeURIComponent(slug)}` : ALL_PRODUCTS_HREF
}
