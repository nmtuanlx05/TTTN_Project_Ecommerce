import { apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type {
  Category,
  CategoryDetail,
  CategoryListParams,
  CreateCategoryInput,
  DeleteCategoryResult,
  UpdateCategoryInput,
} from "./types"

/** Gọi API categories (docs/api/categories.md). Chỉ `queries.ts` được import file này. */

export function listCategories(
  params: CategoryListParams,
  signal?: AbortSignal,
): Promise<Paginated<Category>> {
  return apiGetPage<Category>("/admin/categories", { params, signal })
}

export function createCategory(input: CreateCategoryInput): Promise<CategoryDetail> {
  return apiSend<CategoryDetail>("post", "/admin/categories", input)
}

export function updateCategory(id: number, input: UpdateCategoryInput): Promise<CategoryDetail> {
  return apiSend<CategoryDetail>("patch", `/admin/categories/${id}`, input)
}

/** Xóa cứng; backend từ chối (409) khi còn sản phẩm hoặc danh mục con. */
export function deleteCategory(id: number): Promise<DeleteCategoryResult> {
  return apiSend<DeleteCategoryResult>("delete", `/admin/categories/${id}`)
}
