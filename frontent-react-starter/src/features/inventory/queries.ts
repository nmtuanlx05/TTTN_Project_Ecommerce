import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import {
  adjustStock,
  exportStock,
  getInventorySummary,
  importStock,
  listInventory,
  listMovements,
  updateMinStock,
} from "./api"
import { MOVEMENTS_PAGE_SIZE } from "./constants"
import type {
  AdjustStockInput,
  ExportStockInput,
  ImportStockInput,
  InventoryItem,
  InventoryListParams,
  InventorySummaryParams,
  StockChangeResult,
} from "./types"

export const inventoryKeys = {
  /** Tiền tố chung: làm mới cả danh sách, thẻ số liệu và lịch sử của mọi biến thể. */
  all: ["inventory"] as const,
  list: (params: InventoryListParams) => ["inventory", "list", params] as const,
  summary: (params: InventorySummaryParams) => ["inventory", "summary", params] as const,
  movements: (variantId: number) => ["inventory", "movements", variantId] as const,
}

/**
 * Tiền tố khóa truy vấn sản phẩm: khớp `productKeys.all` ở `features/products/queries.ts`. Không import
 * vì features không import lẫn nhau. Khớp theo tiền tố nên làm mới cả danh sách (`["products", params]`)
 * lẫn chi tiết (`["products", "detail", id]`), nơi trang sửa sản phẩm đọc tồn kho chỉ-đọc.
 * Đổi `productKeys.all` thì phải đổi cả ở đây.
 */
const PRODUCTS_KEY = ["products"] as const

/** Danh sách kho. Giữ dữ liệu trang cũ trong lúc tải trang mới để bảng không giật. */
export function useInventory(params: InventoryListParams) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: ({ signal }) => listInventory(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useInventorySummary(params: InventorySummaryParams) {
  return useQuery({
    queryKey: inventoryKeys.summary(params),
    queryFn: ({ signal }) => getInventorySummary(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Lịch sử của một biến thể, tải thêm theo trang; còn trang kế hay không dựa vào `meta.totalPages`. */
export function useMovements(variantId: number) {
  return useInfiniteQuery({
    queryKey: inventoryKeys.movements(variantId),
    queryFn: ({ pageParam, signal }) =>
      listMovements(variantId, { page: pageParam, limit: MOVEMENTS_PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  })
}

/**
 * Làm mới kho (danh sách, thẻ, lịch sử) và sản phẩm sau khi đổi tồn. Không chờ làm mới xong để hộp thoại
 * đóng ngay; truy vấn đang hiển thị tự cập nhật khi có dữ liệu mới.
 */
function useRefreshStock() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
    void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
  }
}

/**
 * Lỗi cần làm mới danh sách vì số liệu đang hiển thị có thể đã lệch: 404 (biến thể không còn), 409
 * (tồn đã đổi ở nơi khác) và, với nhập/xuất/điều chỉnh, 0 (mất mạng: thao tác có thể đã được ghi).
 */
function shouldRefreshOnError(error: ApiError, refreshOnNetworkError: boolean): boolean {
  return (
    error.statusCode === 404 ||
    error.statusCode === 409 ||
    (refreshOnNetworkError && error.statusCode === 0)
  )
}

type VariantInput<T> = { variantId: number; input: T }

export function useImportStock() {
  const refresh = useRefreshStock()
  return useMutation<StockChangeResult, ApiError, VariantInput<ImportStockInput>>({
    mutationFn: ({ variantId, input }) => importStock(variantId, input),
    onSuccess: refresh,
    onError: (error) => {
      if (shouldRefreshOnError(error, true)) refresh()
    },
  })
}

export function useExportStock() {
  const refresh = useRefreshStock()
  return useMutation<StockChangeResult, ApiError, VariantInput<ExportStockInput>>({
    mutationFn: ({ variantId, input }) => exportStock(variantId, input),
    onSuccess: refresh,
    onError: (error) => {
      if (shouldRefreshOnError(error, true)) refresh()
    },
  })
}

export function useAdjustStock() {
  const refresh = useRefreshStock()
  return useMutation<StockChangeResult, ApiError, VariantInput<AdjustStockInput>>({
    mutationFn: ({ variantId, input }) => adjustStock(variantId, input),
    onSuccess: refresh,
    onError: (error) => {
      if (shouldRefreshOnError(error, true)) refresh()
    },
  })
}

/** Đặt ngưỡng không đổi tồn, nên lỗi mạng chỉ là lỗi thường (không làm mới, không cảnh báo "chưa rõ"). */
export function useUpdateMinStock() {
  const refresh = useRefreshStock()
  return useMutation<InventoryItem, ApiError, { variantId: number; minStock: number }>({
    mutationFn: ({ variantId, minStock }) => updateMinStock(variantId, minStock),
    onSuccess: refresh,
    onError: (error) => {
      if (shouldRefreshOnError(error, false)) refresh()
    },
  })
}
