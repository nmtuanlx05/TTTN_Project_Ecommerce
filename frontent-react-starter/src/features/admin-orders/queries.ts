import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { getAdminOrder, listAdminOrders, updateAdminOrderStatus } from "./api"
import type { AdminOrder, AdminOrderListParams, UpdateOrderStatusInput } from "./types"

/** Mọi key bắt đầu bằng `["admin-orders"]` (tách khỏi `["orders"]` của khách): một lần invalidate làm mới danh sách, chi tiết và huy hiệu. */
export const adminOrderKeys = {
  all: ["admin-orders"] as const,
  list: (params: AdminOrderListParams) => ["admin-orders", "list", params] as const,
  detail: (id: number) => ["admin-orders", "detail", id] as const,
  pendingCount: ["admin-orders", "pending-count"] as const,
}

/** Khóa chữ của kho và sản phẩm (khớp `inventoryKeys.all`, `productKeys.all`; features không import lẫn nhau). Giao/hủy đơn làm đổi tồn. */
const INVENTORY_KEY = ["inventory"] as const
const PRODUCTS_KEY = ["products"] as const

const BADGE_REFRESH_MS = 60_000

export function useAdminOrders(params: AdminOrderListParams) {
  return useQuery({
    queryKey: adminOrderKeys.list(params),
    queryFn: ({ signal }) => listAdminOrders(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Chi tiết theo id số. 404 không thử lại (đã bỏ qua ở `shouldRetry`). */
export function useAdminOrder(id: number) {
  return useQuery<AdminOrder, ApiError>({
    queryKey: adminOrderKeys.detail(id),
    queryFn: ({ signal }) => getAdminOrder(id, signal),
  })
}

/**
 * Số đơn "Chờ xác nhận" cho huy hiệu sidebar: đọc `meta.total` của một trang một dòng. Làm mới khi cửa sổ lấy lại
 * focus và mỗi 60 giây khi tab đang hiện (`refetchIntervalInBackground` mặc định tắt); lỗi thì huy hiệu ẩn, không báo.
 */
export function usePendingOrdersCount() {
  return useQuery({
    queryKey: adminOrderKeys.pendingCount,
    queryFn: async ({ signal }) => {
      const page = await listAdminOrders({ status: "PENDING", page: 1, limit: 1 }, signal)
      return page.meta.total
    },
    refetchInterval: BADGE_REFRESH_MS,
    refetchOnWindowFocus: "always",
    retry: false,
  })
}

/**
 * Đổi trạng thái đơn. API trả luôn đơn mới nên ghi thẳng vào cache chi tiết, rồi làm mới danh sách và huy hiệu
 * (cùng tiền tố), cùng kho và sản phẩm vì giao/hủy đổi `stock`, `reserved`. Lỗi cũng làm mới: 409 nghĩa là
 * dữ liệu trên màn hình đã cũ.
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
    void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY })
    void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
  }
  return useMutation<AdminOrder, ApiError, { id: number } & UpdateOrderStatusInput>({
    mutationFn: ({ id, ...input }) => updateAdminOrderStatus(id, input),
    onSuccess: (order) => {
      queryClient.setQueryData(adminOrderKeys.detail(order.id), order)
      refresh()
    },
    onError: (error) => {
      if (error.statusCode === 409 || error.statusCode === 404 || error.statusCode === 0) refresh()
    },
  })
}
