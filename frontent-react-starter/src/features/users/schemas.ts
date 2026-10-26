import { z } from "zod"
import { PASSWORD_TOO_SHORT_MESSAGE, PASSWORD_MIN_LENGTH } from "@/lib/password-rules"
import { VN_PHONE_REGEX } from "@/lib/vn-phone"

/**
 * Quy tắc phản chiếu CreateUserDto của backend (docs/api/users.md, mục Validate).
 * Message nói rõ sai ở đâu và sửa thế nào. Backend vẫn kiểm tra lại ở server.
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Nhập email để người dùng đăng nhập.")
    .email("Email chưa đúng định dạng. Kiểm tra lại, ví dụ ten@gmail.com."),
  name: z.string().trim().min(1, "Nhập họ tên của người dùng."),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || VN_PHONE_REGEX.test(value), {
      message:
        "Số điện thoại chưa đúng. Nhập số di động Việt Nam, ví dụ 0912345678 hoặc +84912345678, hoặc để trống.",
    }),
  // Không trim: khoảng trắng có thể là một phần của mật khẩu.
  password: z
    .string()
    .min(1, "Nhập mật khẩu cho tài khoản.")
    .min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE),
  role: z.enum(["ADMIN", "STAFF", "CUSTOMER"], { message: "Chọn một vai trò." }),
})

/**
 * Form sửa dùng chung kiểu giá trị với form thêm để một `useForm` phục vụ cả hai.
 * Email và mật khẩu không hiện ở form sửa nên không kiểm tra, và không bao giờ được gửi lên.
 */
export const updateUserSchema = createUserSchema.extend({
  email: z.string(),
  password: z.string(),
})

export type UserFormValues = z.infer<typeof createUserSchema>
