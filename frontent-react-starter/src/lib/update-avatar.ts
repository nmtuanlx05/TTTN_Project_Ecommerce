import { apiSend } from "@/lib/api-client"
import type { User } from "@/types/user"

/**
 * Đặt hoặc xóa ảnh đại diện của CHÍNH người đang đăng nhập: `PATCH /users/me/avatar` (docs/api/users.md).
 * `avatarUrl` phải là URL vừa nhận từ `POST /uploads/avatars`, hoặc `null` để xóa. Gửi `undefined` sẽ bị 400
 * (thiếu trường không được hiểu là xóa) nên kiểu ở đây không cho phép.
 */
export function updateAvatar(avatarUrl: string | null): Promise<User> {
  return apiSend<User>("patch", "/users/me/avatar", { avatarUrl })
}
