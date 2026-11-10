import { ACCOUNT_ORDERS_PATH } from "@/lib/account-paths"
import { accountOrderPath } from "@/lib/order-paths"
import type { OrderPaymentStatus, OrderStatus } from "./types"

/** Nhãn trạng thái ở storefront. Admin dùng `ORDER_STATUS` ở `components/ui/badge.tsx` (COMPLETED là "Đã giao" ở đó; bảng đối chiếu ở docs/storefront-design.md mục 21). */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  PENDING_PAYMENT: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  RETURNED: "Trả hàng",
}

export type OrderTone = "warning" | "info" | "success" | "danger" | "neutral"

/** Màu viên trạng thái: chờ = hổ phách, đã xác nhận/đang giao = xanh dương, hoàn thành = xanh lá, hủy = đỏ. */
export const ORDER_STATUS_TONE: Record<OrderStatus, OrderTone> = {
  PENDING: "warning",
  PENDING_PAYMENT: "warning",
  CONFIRMED: "info",
  SHIPPING: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  RETURNED: "neutral",
}

export type OrderGroup = "pending" | "processing" | "completed" | "cancelled"

/** Mỗi trạng thái thuộc nhóm lọc nào (`null` = chỉ hiện ở "Tất cả"). */
export const ORDER_STATUS_GROUP: Record<OrderStatus, OrderGroup | null> = {
  PENDING: "pending",
  PENDING_PAYMENT: "pending",
  CONFIRMED: "processing",
  SHIPPING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  RETURNED: null,
}

/** Nhóm → các trạng thái gửi backend (`status=A,B`), suy ra từ `ORDER_STATUS_GROUP` nên luôn khớp. */
export const GROUP_STATUSES: Record<OrderGroup, OrderStatus[]> = {
  pending: [],
  processing: [],
  completed: [],
  cancelled: [],
}
for (const [status, group] of Object.entries(ORDER_STATUS_GROUP) as [OrderStatus, OrderGroup | null][]) {
  if (group) GROUP_STATUSES[group].push(status)
}

export const GROUP_LABEL: Record<OrderGroup, string> = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
}

export const ORDER_GROUPS = Object.keys(GROUP_LABEL) as OrderGroup[]

export const PAGE_SIZE = 10
/** Đúng `MAX_MY_ORDERS_QUERY_LENGTH` của backend (dto/query-orders.dto.ts); dài hơn là 400. */
export const MAX_QUERY_LENGTH = 50
/** Đúng `MAX_REASON_LENGTH` của backend (orders.constants.ts). */
export const MAX_REASON_LENGTH = 500
export const DEFAULT_CANCEL_REASON = "Khách tự hủy"

export const PAYMENT_METHOD_LABEL = {
  COD: "Thanh toán khi nhận hàng (COD)",
  ONLINE: "Thanh toán online",
} as const

export const REORDER_REASON_LABEL = {
  UNAVAILABLE: "Đã ngừng bán",
  OUT_OF_STOCK: "Hết hàng",
  MAX_QUANTITY_REACHED: "Đã đạt số lượng tối đa trong giỏ",
  QUANTITY_REDUCED: "Chỉ thêm được một phần",
} as const

/** Đường dẫn trang đơn hàng của tôi. */
export const MY_ORDERS_PATH = ACCOUNT_ORDERS_PATH
export const orderDetailPath = accountOrderPath

/**
 * "Thanh toán ngay" hiện cho mọi đơn chờ thanh toán chưa `PAID`. Danh sách đơn KHÔNG có `paymentExpiresAt` nên không biết đơn đã hết hạn chưa:
 * trang thanh toán (`GET /orders/:code/payment`) quyết định, đơn quá hạn ở đó hiện "hết hạn".
 */
export const canPayNow = (order: { status: OrderStatus; paymentStatus: OrderPaymentStatus }) =>
  order.status === "PENDING_PAYMENT" && order.paymentStatus !== "PAID"

/** Khách chỉ tự hủy khi `PENDING`/`PENDING_PAYMENT` và chưa thanh toán (backend vẫn kiểm: 409 `ORDER_NOT_CANCELLABLE_BY_CUSTOMER`). */
export const canCustomerCancel = (order: { status: OrderStatus; paymentStatus: OrderPaymentStatus }) =>
  (order.status === "PENDING" || order.status === "PENDING_PAYMENT") && order.paymentStatus !== "PAID"

/** Một mã lỗi cho hai nguyên nhân (đã xác nhận, đã thanh toán) nên câu nói chung cả hai. */
export const NOT_CANCELLABLE_MESSAGE =
  "Đơn đã được thanh toán hoặc xác nhận nên không thể tự hủy. Vui lòng liên hệ cửa hàng."
