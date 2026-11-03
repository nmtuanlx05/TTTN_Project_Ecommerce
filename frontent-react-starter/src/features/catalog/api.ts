import { apiGet, apiGetPage } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type { CatalogListParams, CatalogProductDetail, CatalogProductListItem } from "./types"

/** Gọi API công khai của sản phẩm (docs/api/products.md). Chỉ `queries.ts` được import file này. */

export function listCatalogProducts(
  params: CatalogListParams,
  signal?: AbortSignal,
): Promise<Paginated<CatalogProductListItem>> {
  return apiGetPage<CatalogProductListItem>("/products", { params, signal })
}

export function getCatalogProduct(slug: string, signal?: AbortSignal): Promise<CatalogProductDetail> {
  return apiGet<CatalogProductDetail>(`/products/${encodeURIComponent(slug)}`, { signal })
}
