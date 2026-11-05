/** Kiểu đối tượng đơn của API (docs/api/orders.md, mục "Đối tượng đơn"). Tiền là VND, số nguyên. */

export interface OrderItem {
  productName: string
  sku: string
  size: string
  color: string
  colorHex: string | null
  imageUrl: string | null
  quantity: number
  price: number
  lineTotal: number
}

interface NamedCode {
  code: string
  name: string
}

export interface ShippingAddress {
  receiverName: string
  phone: string
  /** Ba cấp là `null` với đơn cũ (trước khi có địa chỉ 3 cấp); khi đó chỉ có `fullAddress`. `ward` còn `null` khi quận/huyện không có phường/xã. */
  province: NamedCode | null
  district: NamedCode | null
  ward: NamedCode | null
  addressLine: string
  fullAddress: string
  note: string | null
}

export type OrderPaymentMethod = "COD" | "ONLINE"

/** Đúng các giá trị enum `OrderStatus` của backend. Mọi bảng nhãn/màu/nhóm là `Record<OrderStatus, ...>` để thiếu một trạng thái là lỗi biên dịch. */
export const ORDER_STATUSES = [
  "PENDING",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderPaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "FAILED"

/** Một dòng lịch sử trạng thái phía khách: có `byRole` nhưng KHÔNG có tên/id nhân viên. */
export interface OrderHistoryEntry {
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  reason: string | null
  createdAt: string
  byRole: "CUSTOMER" | "STAFF" | "ADMIN" | "SYSTEM"
}

export interface Order {
  id: number
  code: string
  status: OrderStatus
  paymentMethod: OrderPaymentMethod
  paymentStatus: OrderPaymentStatus
  paidAt: string | null
  items: OrderItem[]
  subtotal: number
  discountAmount: number
  voucherCode: string | null
  shippingFee: number
  totalAmount: number
  shippingAddress: ShippingAddress
  cancelReason: string | null
  history: OrderHistoryEntry[]
  createdAt: string
}

/** Phần tử của `GET /orders` (đủ để vẽ thẻ đơn). `itemCount` là tổng SỐ LƯỢNG, không phải số dòng. */
export interface OrderListItem {
  id: number
  code: string
  status: OrderStatus
  paymentMethod: OrderPaymentMethod
  paymentStatus: OrderPaymentStatus
  totalAmount: number
  createdAt: string
  itemCount: number
  items: { productName: string; imageUrl: string | null; quantity: number; size: string; color: string }[]
}

/** `GET /orders/summary`. `active` = pending + processing. */
export interface OrdersSummary {
  total: number
  pending: number
  processing: number
  completed: number
  cancelled: number
  active: number
}

export type ReorderSkipReason = "UNAVAILABLE" | "OUT_OF_STOCK" | "MAX_QUANTITY_REACHED" | "QUANTITY_REDUCED"

export interface ReorderResult {
  /** Số DÒNG có thêm ít nhất 1 sản phẩm. */
  added: number
  skipped: { productName: string; size: string; color: string; reason: ReorderSkipReason; message: string }[]
}
