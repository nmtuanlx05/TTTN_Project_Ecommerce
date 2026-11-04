import { z } from "zod"

/** Độ dài email tối đa (cột `email` của backend là VARCHAR(191)). */
const EMAIL_MAX_LENGTH = 191

/** Kiểm tra phía client; thông điệp nói rõ sai ở đâu và sửa thế nào. */
export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Nhập email của bạn.")
    .max(EMAIL_MAX_LENGTH, `Email tối đa ${EMAIL_MAX_LENGTH} ký tự. Rút gọn lại rồi thử lần nữa.`)
    .email("Email chưa đúng định dạng. Kiểm tra lại, ví dụ ten@gmail.com."),
})

export type NewsletterFormValues = z.infer<typeof newsletterSchema>
