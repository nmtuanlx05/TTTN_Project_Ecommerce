import { useCallback } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import type { Paginated } from "@/types/api"
import { NOT_CANCELLABLE_MESSAGE } from "./constants"
import { cancelOrder, getOrder, getOrdersSummary, listMyOrders, reorder, type MyOrdersParams } from "./api"
import type { Order, OrderListItem, OrdersSummary, ReorderResult } from "./types"

/** Mọi key bắt đầu bằng `["orders"]` nên một lần invalidate làm mới danh sách, chi tiết và số đếm. */
export const orderKeys = {
  all: ["orders"] as const,
  list: (params: MyOrdersParams) => ["orders", "list", params] as const,
  summary: ["orders", "summary"] as const,
  detail: (code: string) => ["orders", "detail", code] as const,
}

/** Chi tiết đơn theo mã. Đơn của người khác hoặc không có đều là 404 `ORDER_NOT_FOUND` (không thử lại). */
export function useOrder(code: string) {
  return useQuery<Order, ApiError>({
    queryKey: orderKeys.detail(code),
    queryFn: ({ signal }) => getOrder(code, signal),
    retry: false,
  })
}

/** Danh sách đơn của tôi. Đổi lọc/trang thì giữ dữ liệu cũ (`isPlaceholderData`), không nháy skeleton. */
export function useMyOrders(params: MyOrdersParams) {
  return useQuery<Paginated<OrderListItem>, ApiError>({
    queryKey: orderKeys.list(params),
    queryFn: ({ signal }) => listMyOrders(params, signal),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

/** Số đơn theo nhóm (nút lọc) và `active` (huy hiệu ở header). `enabled` do nơi gọi truyền (chỉ CUSTOMER). */
export function useOrdersSummary({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<OrdersSummary, ApiError>({
    queryKey: orderKeys.summary,
    queryFn: ({ signal }) => getOrdersSummary(signal),
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}

/** Làm mới mọi dữ liệu đơn hàng (vd. sau khi đặt đơn mới). Trang ghép truyền hàm này cho feature khác. */
export function useInvalidateOrders() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orderKeys.all })
  }, [queryClient])
}

/**
 * Khách tự hủy. Thành công hoặc 409 `ORDER_NOT_CANCELLABLE_BY_CUSTOMER` (đơn đã được xác nhận) đều làm mới dữ liệu;
 * lỗi 409 hiện câu riêng (đã xác nhận hoặc đã thanh toán). `onSettled` để nơi gọi đóng hộp thoại.
 */
export function useCancelOrder() {
  const invalidate = useInvalidateOrders()
  const toast = useToast()
  return useMutation<Order, ApiError, { code: string; reason: string }>({
    mutationFn: ({ code, reason }) => cancelOrder(code, reason),
    onSuccess: () => toast.add({ title: "Đã hủy đơn hàng", data: { tone: "success" } }),
    onError: (error) =>
      toast.add({
        title:
          error.code === "ORDER_NOT_CANCELLABLE_BY_CUSTOMER" ? NOT_CANCELLABLE_MESSAGE : error.message,
        data: { tone: "danger" },
      }),
    onSettled: invalidate,
  })
}

/** Mua lại. Không import features/cart: kết quả trả cho nơi gọi (trang) để làm mới và mở giỏ. */
export function useReorder() {
  return useMutation<ReorderResult, ApiError, string>({ mutationFn: reorder })
}
