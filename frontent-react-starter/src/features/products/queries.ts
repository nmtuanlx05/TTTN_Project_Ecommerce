import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import {
  createProduct,
  getProduct,
  listProducts,
  setProductStatus,
  updateProduct,
} from "./api"
import type {
  CreateProductInput,
  ProductDetail,
  ProductListParams,
  UpdateProductInput,
} from "./types"

export const productKeys = {
  /** Tiền tố chung: làm mới cả danh sách phân trang lẫn chi tiết. */
  all: ["products"] as const,
  list: (params: ProductListParams) => ["products", params] as const,
  detail: (id: number) => ["products", "detail", id] as const,
}

/** Danh sách admin. Giữ dữ liệu trang cũ trong lúc tải trang mới để bảng không giật. */
export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => listProducts(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: number) {
  return useQuery<ProductDetail, ApiError>({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => getProduct(id, signal),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation<ProductDetail, ApiError, CreateProductInput>({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation<ProductDetail, ApiError, { id: number; input: UpdateProductInput }>({
    mutationFn: ({ id, input }) => updateProduct(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
    // 404: sản phẩm đã bị xóa ở nơi khác (hiếm, vì không có endpoint xóa), làm mới danh sách.
    onError: (error) => {
      if (error.statusCode === 404) void queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useSetProductStatus() {
  const queryClient = useQueryClient()
  return useMutation<ProductDetail, ApiError, { id: number; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => setProductStatus(id, isActive),
    onSuccess: (saved) => {
      // Đặt thẳng chi tiết mới để tiêu đề trang sửa đổi ngay, rồi làm mới phần còn lại.
      queryClient.setQueryData(productKeys.detail(saved.id), saved)
      return queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
    onError: (error) => {
      if (error.statusCode === 404) void queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}
