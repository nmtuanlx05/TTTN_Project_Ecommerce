import type { SortOrder } from "@/types/api"
import type { PublicCategory } from "@/types/category"

export type CategorySortBy = "id" | "name"

/** Danh mục trong danh sách admin (GET /admin/categories). Chưa có createdAt/isActive. */
export interface Category extends PublicCategory {
  parent: { id: number; name: string } | null
  /** Số sản phẩm thuộc danh mục, tính cả sản phẩm đang ẩn. */
  productCount: number
  /** Số danh mục con trực tiếp. */
  childCount: number
}

/** Response của GET chi tiết, POST và PATCH: thêm danh sách con (sắp theo tên). */
export interface CategoryDetail extends Category {
  children: { id: number; name: string; slug: string }[]
}

/** Query của GET /admin/categories. Trường nào bỏ trống thì không gửi lên. */
export interface CategoryListParams {
  q?: string
  sortBy?: CategorySortBy
  order?: SortOrder
  page?: number
  limit?: number
}

/** Bỏ `parentId` = danh mục gốc; bỏ `slug` = backend tự sinh từ tên. */
export interface CreateCategoryInput {
  name: string
  parentId?: number
  slug?: string
}

/**
 * PATCH chỉ nhận name, parentId, slug (trường khác bị 400). Không gửi `parentId` thì giữ nguyên;
 * `parentId: null` đưa danh mục về gốc.
 */
export interface UpdateCategoryInput {
  name?: string
  parentId?: number | null
  slug?: string
}

export interface DeleteCategoryResult {
  message: string
}
