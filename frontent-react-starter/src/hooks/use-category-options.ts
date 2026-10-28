import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api-client"
import type { PublicCategory } from "@/types/category"

/**
 * Key nằm dưới tiền tố `['categories']` nên mutation của categories (`invalidateQueries(['categories'])`)
 * làm mới luôn danh sách này, và mọi form cần chọn danh mục (cha của danh mục, danh mục của sản phẩm)
 * dùng chung một bản cache.
 */
const CATEGORY_OPTIONS_KEY = ["categories", "options"] as const

/** Toàn bộ danh mục, không phân trang. Endpoint công khai (docs/api/categories.md). */
function listAllCategories(signal?: AbortSignal): Promise<PublicCategory[]> {
  return apiGet<PublicCategory[]>("/categories", { signal })
}

/** Toàn bộ danh mục (phẳng) để chọn trong form hoặc bộ lọc. */
export function useCategoryOptions() {
  return useQuery({
    queryKey: CATEGORY_OPTIONS_KEY,
    queryFn: ({ signal }) => listAllCategories(signal),
  })
}
