import { NEWSLETTER_UNAVAILABLE_MESSAGE } from "./constants"

/** Kết quả của một lần gửi đăng ký. Hiện chỉ có "chưa khả dụng"; giao diện hiện `message` nguyên văn. */
export interface NewsletterResult {
  status: "unavailable"
  message: string
}

/**
 * Gửi email đăng ký nhận tin. Đây là chỗ DUY NHẤT cần đổi khi backend có endpoint.
 *
 * TẠM: backend chưa có API nhận tin nên hàm KHÔNG gọi mạng và KHÔNG giả vờ thành công, chỉ báo "chưa khả dụng". Khi có backend:
 * thay thân hàm bằng `apiSend("/newsletter/subscribers", ...)` (POST /newsletter/subscribers), thêm trạng thái đang gửi và xử lý lỗi
 * ở nhánh newsletter thật, rồi xóa `NEWSLETTER_UNAVAILABLE_MESSAGE`.
 */
export async function subscribeNewsletter(email: string): Promise<NewsletterResult> {
  void email // chưa dùng tới cho đến khi có endpoint thật
  return { status: "unavailable", message: NEWSLETTER_UNAVAILABLE_MESSAGE }
}
