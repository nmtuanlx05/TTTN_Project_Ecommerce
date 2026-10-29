import { useMutation } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { updateAvatar } from "@/lib/update-avatar"
import type { User } from "@/types/user"

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
