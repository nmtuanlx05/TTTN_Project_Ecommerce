import type { AdminActorRole, AdminPaymentMethod, AdminPaymentStatus, OrderStatus } from "./types"

export const PAGE_SIZE = 20

/** Giới hạn của `UpdateOrderStatusDto.reason` (backend `MAX_REASON_LENGTH`). */
export const REASON_MAX_LENGTH = 500

/** Nút lọc nhanh. Chỉ gồm trạng thái backend nhận được; PACKING không còn, RETURNED chưa dùng. */
export const STATUS_TABS: readonly OrderStatus[] = ["PENDING_PAYMENT", "PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"]

export const PAYMENT_METHOD_LABEL: Record<AdminPaymentMethod, string> = {
  COD: "COD",
  ONLINE: "Online",
}

export const ACTOR_ROLE_LABEL: Record<AdminActorRole, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  CUSTOMER: "Khách hàng",
}

/** Hành động đổi trạng thái giao diện cho phép. Mọi bước khác backend trả 409 `ORDER_INVALID_TRANSITION`. */
export type OrderAction = "confirm" | "ship" | "complete" | "cancel"

export const ORDER_ACTIONS: Record<OrderStatus, readonly OrderAction[]> = {
  PENDING: ["confirm", "cancel"],
  // Chỉ hủy: PENDING_PAYMENT → PENDING không có nút nào (chỉ hệ thống làm khi nhận tiền, hoặc ADMIN bấm "Xác nhận đã nhận tiền" riêng).
  PENDING_PAYMENT: ["cancel"],
  CONFIRMED: ["ship", "cancel"],
  SHIPPING: ["complete"],
  COMPLETED: [],
  CANCELLED: [],
  RETURNED: [],
}

export const ACTION_TARGET: Record<OrderAction, OrderStatus> = {
  confirm: "CONFIRMED",
  ship: "SHIPPING",
  complete: "COMPLETED",
  cancel: "CANCELLED",
}

export const ACTION_LABEL: Record<OrderAction, string> = {
  confirm: "Xác nhận đơn",
  ship: "Bắt đầu giao hàng",
  complete: "Hoàn tất giao hàng",
  cancel: "Hủy đơn",
}

/** Giải thích khi không còn hành động nào. */
export const NO_ACTION_NOTE: Partial<Record<OrderStatus, string>> = {
  COMPLETED: "Đơn đã giao xong, không còn thao tác nào.",
  CANCELLED: "Đơn đã bị hủy, không còn thao tác nào.",
  RETURNED: "Đơn trả hàng chưa được hỗ trợ ở bản này.",
}

/** Mã lỗi backend (docs/api/orders.md). */
export const ERROR_CODE = {
  invalidTransition: "ORDER_INVALID_TRANSITION",
  systemBusy: "SYSTEM_BUSY",
  notFound: "ORDER_NOT_FOUND",
  cancelReasonRequired: "ORDER_CANCEL_REASON_REQUIRED",
  paidAdminOnly: "ORDER_PAID_ADMIN_ONLY",
} as const

export const PAID_ADMIN_ONLY_MESSAGE = "Đơn đã thanh toán, chỉ quản trị viên được hủy (cần hoàn tiền cho khách)."

/** Nút "Xác nhận đã nhận tiền" chỉ có với đơn online còn chờ chuyển khoản. */
export const isAwaitingBankTransfer = (order: { status: OrderStatus; paymentMethod: AdminPaymentMethod; paymentStatus: AdminPaymentStatus }) =>
  order.status === "PENDING_PAYMENT" && order.paymentMethod === "ONLINE" && order.paymentStatus === "UNPAID"
