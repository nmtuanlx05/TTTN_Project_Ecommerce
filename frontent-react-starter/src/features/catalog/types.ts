import type { SortOrder } from "@/types/api"

/** Kiểu của API công khai (docs/api/products.md, GET /products). Không có tồn kho, chỉ biết còn/hết. */

export interface CatalogCategoryRef {
  id: number
  name: string
  slug: string
}

/** Một thẻ trong danh sách (GET /products). */
export interface CatalogProductListItem {
  id: number
  name: string
  slug: string
  /** VND, số nguyên. */
  price: number
  imageUrl: string | null
  category: CatalogCategoryRef
  /** Còn ít nhất một biến thể đang bán có tồn khả dụng. */
  inStock: boolean
}

/** Biến thể đang bán. Có `sku` nhưng giao diện khách không hiển thị. */
export interface CatalogVariant {
  id: number
  sku: string
  size: string
  color: string
  inStock: boolean
}

/** Chi tiết (GET /products/:slug). */
export interface CatalogProductDetail extends CatalogProductListItem {
  description: string | null
  variants: CatalogVariant[]
}

/** Ba kiểu sắp xếp của storefront; `newest` là mặc định của backend. */
export type CatalogSort = "newest" | "price-asc" | "price-desc"

/** Query của GET /products. Trường nào bỏ trống thì không gửi lên. */
export interface CatalogListParams {
  q?: string
  categoryId?: number
  minPrice?: number
  maxPrice?: number
  excludeId?: number
  sortBy?: "createdAt" | "price"
  order?: SortOrder
  page?: number
  limit?: number
}
