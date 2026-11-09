import type { PaymentTransaction } from "./types"

/**
 * Giao dịch không khớp (UNMATCHED) luôn phải chọn đơn (kể cả khi đang gắn một đơn COD); giao dịch thiếu tiền (UNDERPAID) của đơn còn chờ thanh toán
 * xác nhận thẳng cho đơn đó. Các lý do còn lại (thừa, đơn đã đóng, trả trùng) chỉ có "Đánh dấu đã xử lý" vì đơn không còn chờ thanh toán.
 */
export function confirmTarget(transaction: PaymentTransaction): "pick" | "order" | null {
  if (transaction.reviewReason === "UNMATCHED") return "pick"
  if (transaction.reviewReason === "UNDERPAID" && transaction.order?.status === "PENDING_PAYMENT") return "order"
  return null
}
