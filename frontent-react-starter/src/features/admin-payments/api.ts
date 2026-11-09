import { apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type {
  AwaitingOrder,
  ConfirmPaymentInput,
  ConfirmPaymentResult,
  PaymentTransaction,
  TransactionListParams,
} from "./types"

/** Gọi API quản trị thanh toán (docs/api/payments.md), chỉ ADMIN. Chỉ `queries.ts` được import file này. */

export function listTransactions(
  params: TransactionListParams,
  signal?: AbortSignal,
): Promise<Paginated<PaymentTransaction>> {
  return apiGetPage<PaymentTransaction>("/admin/payments/transactions", { params, signal })
}

export function confirmOrderPayment(orderId: number, input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  return apiSend<ConfirmPaymentResult>("post", `/admin/orders/${orderId}/confirm-payment`, input)
}

export function resolveTransaction(id: number, note: string): Promise<{ id: number; resolved: boolean }> {
  return apiSend<{ id: number; resolved: boolean }>("post", `/admin/payments/transactions/${id}/resolve`, { note })
}

/** Tìm đơn đang chờ thanh toán theo mã/số điện thoại/tên (`q` của `GET /admin/orders`), tối đa `limit` kết quả. */
export async function searchAwaitingOrders(q: string, signal?: AbortSignal): Promise<AwaitingOrder[]> {
  const page = await apiGetPage<AwaitingOrder>("/admin/orders", {
    params: { status: "PENDING_PAYMENT", q, page: 1, limit: 8 },
    signal,
  })
  return page.items
}
