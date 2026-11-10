import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { confirmOrderPayment, listTransactions, resolveTransaction, searchAwaitingOrders } from "./api"
import type {
  AwaitingOrder,
  ConfirmPaymentInput,
  ConfirmPaymentResult,
  PaymentTransaction,
  TransactionListParams,
} from "./types"
import type { Paginated } from "@/types/api"

/** Mọi key bắt đầu bằng `["admin-payments"]` nên một lần invalidate làm mới danh sách giao dịch. */
export const adminPaymentKeys = {
  all: ["admin-payments"] as const,
  list: (params: TransactionListParams) => ["admin-payments", "list", params] as const,
  awaiting: (q: string) => ["admin-payments", "awaiting-orders", q] as const,
}

/** Khóa chữ của đơn quản trị (khớp `adminOrderKeys.all`; features không import lẫn nhau). Xác nhận thanh toán đổi trạng thái đơn. */
const ADMIN_ORDERS_KEY = ["admin-orders"] as const

export function useTransactions(params: TransactionListParams) {
  return useQuery<Paginated<PaymentTransaction>, ApiError>({
    queryKey: adminPaymentKeys.list(params),
    queryFn: ({ signal }) => listTransactions(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Đơn chờ thanh toán khớp `q` (chỉ tìm khi đủ 2 ký tự). Dùng cho giao dịch không khớp đơn nào. */
export function useAwaitingOrders(q: string) {
  return useQuery<AwaitingOrder[], ApiError>({
    queryKey: adminPaymentKeys.awaiting(q),
    queryFn: ({ signal }) => searchAwaitingOrders(q, signal),
    enabled: q.length >= 2,
    retry: false,
  })
}

/** Làm mới giao dịch và đơn quản trị (cả thành công lẫn 404/409: dữ liệu trên màn hình đã cũ). */
function useRefreshPayments() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminPaymentKeys.all })
    void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY })
  }
}

export function useConfirmPayment() {
  const refresh = useRefreshPayments()
  return useMutation<ConfirmPaymentResult, ApiError, { orderId: number } & ConfirmPaymentInput>({
    mutationFn: ({ orderId, ...input }) => confirmOrderPayment(orderId, input),
    onSuccess: refresh,
    onError: (error) => {
      if (error.statusCode === 409 || error.statusCode === 404 || error.statusCode === 0) refresh()
    },
  })
}

export function useResolveTransaction() {
  const refresh = useRefreshPayments()
  return useMutation<{ id: number; resolved: boolean }, ApiError, { id: number; note: string }>({
    mutationFn: ({ id, note }) => resolveTransaction(id, note),
    onSuccess: refresh,
    onError: (error) => {
      if (error.statusCode === 409 || error.statusCode === 404 || error.statusCode === 0) refresh()
    },
  })
}
