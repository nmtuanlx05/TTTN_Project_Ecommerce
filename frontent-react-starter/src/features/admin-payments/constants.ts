import type { ReviewFilter, ReviewReason } from "./types"

export const PAGE_SIZE = 20

/** Giới hạn `note` của `confirm-payment` (1-300 ký tự, theo tài liệu). Ở `resolve` tài liệu chỉ ghi "bắt buộc": tạm dùng cùng giới hạn. */
export const NOTE_MAX_LENGTH = 300

export const REVIEW_FILTERS: readonly { value: ReviewFilter; label: string }[] = [
  { value: "pending", label: "Chưa xử lý" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "all", label: "Tất cả" },
]

export const DEFAULT_REVIEW: ReviewFilter = "pending"

/** Lý do giao dịch cần xem lại, bằng tiếng Việt. */
export const REASON_LABEL: Record<ReviewReason, string> = {
  UNDERPAID: "Chuyển thiếu tiền",
  OVERPAID: "Chuyển thừa tiền",
  ORDER_CLOSED: "Đơn đã hủy hoặc hết hạn",
  DUPLICATE_PAID: "Đơn đã thanh toán, chuyển thêm",
  UNMATCHED: "Không khớp đơn nào",
}

/** Việc admin cần làm với từng lý do (hiện dưới nhãn lý do). Hoàn tiền luôn làm ngoài hệ thống. */
export const REASON_HINT: Record<ReviewReason, string> = {
  UNDERPAID: "Chờ khách chuyển bù rồi xác nhận, hoặc hoàn tiền ngoài hệ thống rồi đánh dấu đã xử lý.",
  OVERPAID: "Đơn đã được xác nhận. Hoàn phần thừa cho khách ngoài hệ thống rồi đánh dấu đã xử lý.",
  ORDER_CLOSED: "Đơn đã đóng nên không mở lại. Hoàn tiền cho khách ngoài hệ thống rồi đánh dấu đã xử lý.",
  DUPLICATE_PAID: "Đơn đã được thanh toán trước đó. Hoàn khoản chuyển thêm ngoài hệ thống rồi đánh dấu đã xử lý.",
  UNMATCHED: "Tìm đơn đang chờ thanh toán tương ứng để xác nhận, hoặc hoàn tiền ngoài hệ thống rồi đánh dấu đã xử lý.",
}

/** Mã lỗi backend (docs/api/payments.md, bảng lỗi). */
export const ERROR_CODE = {
  orderNotFound: "ORDER_NOT_FOUND",
  notAwaitingPayment: "ORDER_NOT_AWAITING_PAYMENT",
  txnOrderMismatch: "PAYMENT_TXN_ORDER_MISMATCH",
  txnNotFound: "PAYMENT_TXN_NOT_FOUND",
  txnNotReviewable: "PAYMENT_TXN_NOT_REVIEWABLE",
  txnAlreadyResolved: "PAYMENT_TXN_ALREADY_RESOLVED",
} as const

export const TRANSACTION_HEADERS = ["Thời gian", "Số tiền", "Nội dung chuyển khoản", "Lý do", "Đơn hàng", "Xử lý"] as const
