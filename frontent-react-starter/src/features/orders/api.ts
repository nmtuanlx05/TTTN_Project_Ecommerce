import { apiGet } from "@/lib/api-client"
import type { Order } from "./types"

/** Gọi API đơn hàng của khách (docs/api/orders.md). Chỉ `queries.ts` được import file này. */

export function getOrder(code: string, signal?: AbortSignal): Promise<Order> {
  return apiGet<Order>(`/orders/${encodeURIComponent(code)}`, { signal })
}
