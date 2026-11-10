import { useMutation } from "@tanstack/react-query"
import { apiSend } from "@/lib/api-client"
import type { ApiError } from "@/lib/api-error"
import type { User } from "@/types/user"

/**
 * Đặt hoặc xóa ảnh đại diện của CHÍNH người đang đăng nhập: `PATCH /users/me/avatar` (docs/api/users.md).
 * Body gửi ĐÚNG MỘT trường: `{ assetId }` (id ảnh vừa nhận từ `POST /uploads/avatars`, chỉ gắn được ảnh chính mình đã tải) hoặc
 * `{ avatarUrl: null }` để xóa. Gửi cả hai hoặc không gửi trường nào sẽ bị 400 (thiếu trường không được hiểu là xóa) nên kiểu
 * ở đây không cho phép.
 */
export type AvatarChange = { assetId: number } | { avatarUrl: null }

function updateAvatar(change: AvatarChange): Promise<User> {
  return apiSend<User>("patch", "/users/me/avatar", change)
}

/**
 * Lưu ảnh đại diện của chính mình. `onUpdated` nhận User mới từ server; việc cập nhật phiên đăng nhập và
 * làm mới cache nằm ở nơi gọi vì hooks/ không được import features/.
 */
export function useUpdateAvatar({ onUpdated }: { onUpdated: (user: User) => void }) {
  return useMutation<User, ApiError, AvatarChange>({
    mutationFn: updateAvatar,
    onSuccess: onUpdated,
  })
}
