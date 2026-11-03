import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { getCatalogProduct, listCatalogProducts } from "./api"
import type { CatalogListParams, CatalogProductDetail } from "./types"

/**
 * Tiền tố `catalog` tách hẳn khỏi `["products"]` của admin: hai bên khác hình dạng dữ liệu, và mutation
 * của admin không nên làm mới cache của khách (khách tự làm mới theo staleTime).
 */
export const catalogKeys = {
  all: ["catalog"] as const,
  list: (params: CatalogListParams) => ["catalog", "products", params] as const,
  detail: (slug: string) => ["catalog", "product", slug] as const,
}

/** Danh sách công khai. Giữ dữ liệu cũ trong lúc tải bộ lọc/trang mới để lưới không nháy skeleton. */
export function useCatalogProducts(params: CatalogListParams, { enabled = true } = {}) {
  return useQuery({
    queryKey: catalogKeys.list(params),
    queryFn: ({ signal }) => listCatalogProducts(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useCatalogProduct(slug: string) {
  return useQuery<CatalogProductDetail, ApiError>({
    queryKey: catalogKeys.detail(slug),
    queryFn: ({ signal }) => getCatalogProduct(slug, signal),
  })
}

/** Tải trước chi tiết khi rê chuột hoặc focus vào thẻ. Dữ liệu còn mới thì không gọi lại. */
export function usePrefetchCatalogProduct() {
  const queryClient = useQueryClient()
  return (slug: string) =>
    void queryClient.prefetchQuery({
      queryKey: catalogKeys.detail(slug),
      queryFn: ({ signal }) => getCatalogProduct(slug, signal),
    })
}
