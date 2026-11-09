import { ACCOUNT_ORDERS_PATH } from "@/lib/account-paths"

/**
 * Đường dẫn trang đơn hàng của khách. Nằm ở `lib/` vì checkout, đơn hàng và thanh toán đều cần mà features không import lẫn nhau.
 * Trang thanh toán chuyển khoản của một đơn ONLINE (route khai báo ở `routes/storefront-routes.tsx`).
 */
export const orderPaymentPath = (code: string) => `/thanh-toan-online/${encodeURIComponent(code)}`

/** Trang chi tiết một đơn trong tài khoản. */
export const accountOrderPath = (code: string) => `${ACCOUNT_ORDERS_PATH}/${encodeURIComponent(code)}`
