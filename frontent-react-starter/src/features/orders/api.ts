import { apiGet, apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type { Order, OrderListItem, OrdersSummary, ReorderResult } from "./types"

/** Gọi API đơn hàng của khách (docs/api/orders.md). Chỉ `queries.ts` được import file này. */

export interface MyOrdersParams {
  /** Nhiều trạng thái phân tách bằng dấu phẩy. */
  status?: string
  q?: string
  page: number
  limit: number
}

export function getOrder(code: string, signal?: AbortSignal): Promise<Order> {
  return apiGet<Order>(`/orders/${encodeURIComponent(code)}`, { signal })
}

export function listMyOrders(params: MyOrdersParams, signal?: AbortSignal): Promise<Paginated<OrderListItem>> {
  return apiGetPage<OrderListItem>("/orders", { params, signal })
}

export function getOrdersSummary(signal?: AbortSignal): Promise<OrdersSummary> {
  return apiGet<OrdersSummary>("/orders/summary", { signal })
}

export function cancelOrder(code: string, reason: string): Promise<Order> {
  return apiSend<Order>("post", `/orders/${encodeURIComponent(code)}/cancel`, { reason })
}

export function reorder(code: string): Promise<ReorderResult> {
  return apiSend<ReorderResult>("post", `/orders/${encodeURIComponent(code)}/reorder`)
}
