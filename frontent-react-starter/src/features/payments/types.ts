/** Kiểu của `GET /orders/:code/payment` (backend docs/api/payments.md). Tiền là VND, số nguyên. */

export type PaymentState = "AWAITING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED"

/** Thông tin chuyển khoản: chỉ có khi `state = AWAITING_PAYMENT`. Mọi giá trị do backend trả, frontend không giữ thông tin tài khoản. */
export interface TransferInfo {
  /** Nội dung chuyển khoản (mã đơn bỏ ký tự đặc biệt), khách phải giữ nguyên. */
  content: string
  bank: { bin: string; code: string; name: string }
  accountNo: string
  accountName: string
  /** Chuỗi EMVCo/VietQR để vẽ thành mã QR ở phía client. */
  qrPayload: string
}

export interface OrderPayment {
  state: PaymentState
  orderCode: string
  amount: number
  expiresAt: string | null
  paidAt: string | null
  transfer?: TransferInfo
}
