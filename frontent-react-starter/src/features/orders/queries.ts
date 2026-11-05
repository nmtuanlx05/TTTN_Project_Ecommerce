import { useQuery } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { getOrder } from "./api"
import type { Order } from "./types"

export const orderKeys = {
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
