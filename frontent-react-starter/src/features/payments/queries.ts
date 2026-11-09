import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { getOrderPayment } from "./api"
import { POLL_INTERVAL_MS, STOP_POLLING_STATUS } from "./constants"
import type { OrderPayment } from "./types"

export const paymentKeys = {
  order: (code: string) => ["payments", "order", code] as const,
}

/** Khóa chữ của dữ liệu đơn hàng khách (khớp `orderKeys.all` ở features/orders; features không import lẫn nhau). */
const ORDERS_KEY = ["orders"] as const

/**
 * Thông tin thanh toán của đơn ONLINE. Tự hỏi lại mỗi `POLL_INTERVAL_MS` CHỈ khi `state = AWAITING_PAYMENT`; sang trạng thái khác thì dừng
 * và làm mới dữ liệu đơn hàng (danh sách, chi tiết, số đếm). Tab ẩn thì tạm dừng, về tab thì hỏi ngay. Lỗi 401/403/404/409 dừng hẳn;
 * mất mạng hoặc 5xx giữ dữ liệu cũ và tiếp tục thử. Trạng thái luôn do backend quyết định (`EXPIRED` tính khi đọc), đồng hồ khách chỉ để hiển thị.
 */
export function usePaymentInfo(code: string) {
  const queryClient = useQueryClient()
  const query = useQuery<OrderPayment, ApiError>({
    queryKey: paymentKeys.order(code),
    queryFn: ({ signal }) => getOrderPayment(code, signal),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: (current) => {
      if (current.state.data?.state !== "AWAITING_PAYMENT") return false
      const status = current.state.error?.statusCode
      if (status !== undefined && STOP_POLLING_STATUS.includes(status)) return false
      return POLL_INTERVAL_MS
    },
  })

  const state = query.data?.state
  useEffect(() => {
    if (state && state !== "AWAITING_PAYMENT") {
      void queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    }
  }, [state, queryClient])

  return query
}
