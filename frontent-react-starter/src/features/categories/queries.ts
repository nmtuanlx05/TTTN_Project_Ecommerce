import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "./api"
import type {
  CategoryDetail,
  CategoryListParams,
  CreateCategoryInput,
  DeleteCategoryResult,
  UpdateCategoryInput,
} from "./types"

export const categoryKeys = {
  /**
   * Tiền tố chung: làm mới cả danh sách phân trang lẫn danh sách chọn danh mục
   * (`hooks/use-category-options.ts`, key `['categories', 'options']`).
   */
  all: ["categories"] as const,
  list: (params: CategoryListParams) => ["categories", params] as const,
}

/** Danh sách admin. Giữ dữ liệu trang cũ trong lúc tải trang mới để bảng không giật. */
export function useCategories(params: CategoryListParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: ({ signal }) => listCategories(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation<CategoryDetail, ApiError, CreateCategoryInput>({
    mutationFn: createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    // 409 vì danh mục cha vừa bị người khác đổi/xóa: làm mới để lần thử sau thấy dữ liệu mới.
    onError: (error) => {
      if (error.statusCode === 409) void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation<CategoryDetail, ApiError, { id: number; input: UpdateCategoryInput }>({
    mutationFn: ({ id, input }) => updateCategory(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    // 404: danh mục đã bị xóa ở nơi khác, làm mới để nó biến khỏi bảng.
    onError: (error) => {
      if (error.statusCode === 404) void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation<DeleteCategoryResult, ApiError, number>({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    // 404 (đã bị xóa) và 409 (số sản phẩm/danh mục con đã đổi): làm mới để số liệu trên bảng đúng.
    onError: (error) => {
      if (error.statusCode === 404 || error.statusCode === 409) {
        void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      }
    },
  })
}
