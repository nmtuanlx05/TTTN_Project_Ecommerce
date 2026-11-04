import { useMutation } from "@tanstack/react-query"
import { apiSend } from "@/lib/api-client"
import type { ApiError } from "@/lib/api-error"
import type { User } from "@/types/user"

/**
 * Đặt hoặc xóa ảnh đại diện của CHÍNH người đang đăng nhập: `PATCH /users/me/avatar` (docs/api/users.md).
 * `avatarUrl` phải là URL vừa nhận từ `POST /uploads/avatars`, hoặc `null` để xóa. Gửi `undefined` sẽ bị 400
 * (thiếu trường không được hiểu là xóa) nên kiểu ở đây không cho phép.
 */
function updateAvatar(avatarUrl: string | null): Promise<User> {
  return apiSend<User>("patch", "/users/me/avatar", { avatarUrl })
}

/**
 * Lưu ảnh đại diện của chính mình. `onUpdated` nhận User mới từ server; việc cập nhật phiên đăng nhập và
 * làm mới cache nằm ở nơi gọi vì hooks/ không được import features/.
 */
export function useUpdateAvatar({ onUpdated }: { onUpdated: (user: User) => void }) {
  return useMutation<User, ApiError, string | null>({
    mutationFn: updateAvatar,
    onSuccess: onUpdated,
  })
}
