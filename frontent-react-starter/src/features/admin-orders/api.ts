import { apiGet, apiGetPage, apiSend } from "@/lib/api-client"
import type { Paginated } from "@/types/api"
import type {
  AdminOrder,
  AdminOrderListItem,
  AdminOrderListParams,
  UpdateOrderStatusInput,
} from "./types"

/** Gọi API quản trị đơn hàng (backend docs/api/orders.md). Chỉ `queries.ts` được import file này. */

export function listAdminOrders(
  params: AdminOrderListParams,
  signal?: AbortSignal,
): Promise<Paginated<AdminOrderListItem>> {
  return apiGetPage<AdminOrderListItem>("/admin/orders", { params, signal })
}

export function getAdminOrder(id: number, signal?: AbortSignal): Promise<AdminOrder> {
  return apiGet<AdminOrder>(`/admin/orders/${id}`, { signal })
}

export function updateAdminOrderStatus(id: number, input: UpdateOrderStatusInput): Promise<AdminOrder> {
  return apiSend<AdminOrder>("patch", `/admin/orders/${id}/status`, input)
}
