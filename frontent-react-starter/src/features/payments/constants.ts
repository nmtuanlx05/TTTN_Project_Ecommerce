/** Chu kỳ hỏi lại backend khi đơn còn chờ thanh toán. */
export const POLL_INTERVAL_MS = 4_000

/** Mã lỗi của `GET /orders/:code/payment` (docs/api/payments.md, bảng lỗi). */
export const ERROR_CODE = {
  notFound: "ORDER_NOT_FOUND",
  notOnline: "ORDER_NOT_ONLINE",
  notSupported: "PAYMENT_METHOD_NOT_SUPPORTED",
} as const

/** Các mã HTTP mà hỏi lại cũng không khác đi: dừng polling. Lỗi mạng (0) và 5xx thì vẫn thử tiếp. */
export const STOP_POLLING_STATUS: readonly number[] = [401, 403, 404, 409]
