import type { OrderStatus } from "@/components/ui/badge"

/** Kiểu dữ liệu API quản trị đơn hàng (backend docs/api/orders.md, mục "Endpoint quản trị"). Tiền là VND, số nguyên. */

export type { OrderStatus }

export type AdminPaymentMethod = "COD" | "ONLINE"
export type AdminPaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "FAILED"
export type AdminActorRole = "ADMIN" | "STAFF" | "CUSTOMER"

export interface AdminOrderItem {
  productName: string
  sku: string
  size: string
  color: string
  colorHex: string | null
  imageUrl: string | null
  quantity: number
  price: number
}

/** Dòng của `GET /admin/orders`. Không có `itemCount`: tổng số lượng tính từ `items`. */
export interface AdminOrderListItem {
  id: number
  code: string
  status: OrderStatus
  paymentMethod: AdminPaymentMethod
  paymentStatus: AdminPaymentStatus
  subtotal: number
  discountAmount: number
  voucherCode: string | null
  shippingFee: number
  totalAmount: number
  customerName: string
  customerPhone: string
  createdAt: string
  items: AdminOrderItem[]
}

interface NamedCode {
  code: string
  name: string
}

export interface AdminShippingAddress {
  receiverName: string
  phone: string
  province: NamedCode | null
  district: NamedCode | null
  ward: NamedCode | null
  addressLine: string
  /** Chuỗi ghép đầy đủ do backend dựng; đơn cũ chỉ có chuỗi này. */
  fullAddress: string
  note: string | null
}

/** Người đổi trạng thái; `null` nghĩa là hệ thống (vd. tự hủy quá hạn). */
export interface AdminOrderActor {
  id: number
  name: string | null
  role: AdminActorRole
}

export interface AdminOrderHistoryEntry {
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  reason: string | null
  createdAt: string
  actor: AdminOrderActor | null
}

/** `GET /admin/orders/:id` (cũng là kết quả của `PATCH /admin/orders/:id/status`). */
export interface AdminOrder {
  id: number
  code: string
  status: OrderStatus
  paymentMethod: AdminPaymentMethod
  paymentStatus: AdminPaymentStatus
  paidAt: string | null
  items: (AdminOrderItem & { lineTotal: number })[]
  subtotal: number
  discountAmount: number
  voucherCode: string | null
  shippingFee: number
  totalAmount: number
  shippingAddress: AdminShippingAddress
  cancelReason: string | null
  customer: { id: number; email: string; name: string | null } | null
  customerEmail: string | null
  handledBy: { id: number; name: string | null } | null
  history: AdminOrderHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface AdminOrderListParams {
  status?: OrderStatus
  from?: string
  to?: string
  q?: string
  page: number
  limit: number
}

export interface UpdateOrderStatusInput {
  status: OrderStatus
  reason?: string
}
