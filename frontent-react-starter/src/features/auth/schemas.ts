import { z } from "zod"
import { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from "@/lib/password-rules"
import { VN_PHONE_REGEX } from "@/lib/vn-phone"

const emailField = z
  .string()
  .trim()
  .min(1, "Nhập email của bạn.")
  .email("Email chưa đúng định dạng. Kiểm tra lại, ví dụ ten@gmail.com.")

/**
 * Quy tắc phản chiếu LoginDto của backend (docs/api/auth.md, mục Validate): đăng nhập chỉ kiểm
 * mật khẩu không để trống, không kiểm độ dài (mật khẩu cũ vẫn phải đăng nhập được). Không trim mật khẩu.
 */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Nhập mật khẩu của bạn."),
})

/**
 * Quy tắc phản chiếu RegisterDto. Mật khẩu không trim (khoảng trắng có thể là một phần của mật khẩu).
 * `name` và `phone` tùy chọn: để trống thì form không gửi trường đó lên.
 */
export const registerSchema = z
  .object({
    email: emailField,
    password: z
      .string()
      .min(1, "Nhập mật khẩu cho tài khoản.")
      .min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE),
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu để xác nhận."),
    name: z.string().trim(),
    phone: z
      .string()
      .trim()
      .refine((value) => value === "" || VN_PHONE_REGEX.test(value), {
        message:
          "Số điện thoại chưa đúng. Nhập số di động Việt Nam, ví dụ 0912345678 hoặc +84912345678, hoặc để trống.",
      }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp. Nhập lại cho giống mật khẩu ở trên.",
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
