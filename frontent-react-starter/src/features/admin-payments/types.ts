/** Kiểu dữ liệu API quản trị thanh toán (backend docs/api/payments.md, mục "Endpoint quản trị"). Tiền là VND, số nguyên. */

/** `review` của `GET /admin/payments/transactions`: chưa xử lý (mặc định), đã xử lý, tất cả. */
export type ReviewFilter = "pending" | "resolved" | "all"

export type ReviewReason = "UNDERPAID" | "OVERPAID" | "ORDER_CLOSED" | "DUPLICATE_PAID" | "UNMATCHED"

/** Đơn gắn với giao dịch; `null` khi giao dịch không khớp đơn nào. `status` là trạng thái đơn (chuỗi enum của backend). */
export interface TransactionOrder {
  id: number
  code: string
  status: string
  totalAmount: number
}

export interface PaymentTransaction {
  id: number
  provider: string
  providerTxnId: string | null
  amount: number
  content: string | null
  status: string
  /** `null` ở giao dịch thành công bình thường; vì danh sách chỉ liệt kê giao dịch cần xem nên thường có giá trị. */
  reviewReason: ReviewReason | null
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
  order: TransactionOrder | null
  resolvedBy: { id: number; name: string | null } | null
}

export interface TransactionListParams {
  review: ReviewFilter
  page: number
  limit: number
}

export interface ConfirmPaymentInput {
  note: string
  /** Giao dịch đang chờ xử lý được gắn vào đơn này và đánh dấu đã xử lý. */
  transactionId?: number
}

export interface ConfirmPaymentResult {
  result: string
  transactionId: number
  orderCode: string
  overpaid: boolean
}

/** Đơn cần xác nhận: đủ để hộp thoại hiện mã và tổng tiền sẽ được ghi nhận. */
export interface ConfirmOrderTarget {
  id: number
  code: string
  totalAmount: number
}

/** Đơn `PENDING_PAYMENT` tìm được để gắn cho giao dịch không khớp. */
export interface AwaitingOrder extends ConfirmOrderTarget {
  customerName: string
  customerPhone: string
}
