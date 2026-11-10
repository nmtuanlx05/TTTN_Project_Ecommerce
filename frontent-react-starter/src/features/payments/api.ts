import { apiGet } from "@/lib/api-client"
import type { OrderPayment } from "./types"

/** Gọi API thanh toán của khách (docs/api/payments.md). Chỉ `queries.ts` được import file này. */

export function getOrderPayment(code: string, signal?: AbortSignal): Promise<OrderPayment> {
  return apiGet<OrderPayment>(`/orders/${encodeURIComponent(code)}/payment`, { signal })
}
