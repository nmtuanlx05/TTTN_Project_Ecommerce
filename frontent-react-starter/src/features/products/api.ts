import { apiGet, apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type {
  CreateProductInput,
  ProductDetail,
  ProductListItem,
  ProductListParams,
  UpdateProductInput,
} from "./types"

/** Gọi API products (docs/api/products.md, phía admin). Chỉ `queries.ts` được import file này. */

export function listProducts(
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<Paginated<ProductListItem>> {
  return apiGetPage<ProductListItem>("/admin/products", { params, signal })
}

export function getProduct(id: number, signal?: AbortSignal): Promise<ProductDetail> {
  return apiGet<ProductDetail>(`/admin/products/${id}`, { signal })
}

export function createProduct(input: CreateProductInput): Promise<ProductDetail> {
  return apiSend<ProductDetail>("post", "/admin/products", input)
}

export function updateProduct(id: number, input: UpdateProductInput): Promise<ProductDetail> {
  return apiSend<ProductDetail>("patch", `/admin/products/${id}`, input)
}

/** Ẩn / hiện sản phẩm (xóa mềm). Không đổi `isActive` của từng biến thể. */
export function setProductStatus(id: number, isActive: boolean): Promise<ProductDetail> {
  return apiSend<ProductDetail>("patch", `/admin/products/${id}/status`, { isActive })
}
