import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth-store"
import { userKeys } from "@/features/users/queries"
import type { User } from "@/types/user"

/**
 * Việc cần làm sau khi người dùng lưu ảnh đại diện của chính mình, dùng chung cho khung admin và storefront:
 * cập nhật user trong phiên (menu và topbar đổi ngay) và làm mới danh sách người dùng đang cache (bảng
 * người dùng của admin). Nằm ở routes/ vì `components/` không được đọc phiên hay import features/.
 */
export function useAvatarSaved(): (user: User) => void {
  const queryClient = useQueryClient()
  return (user) => {
    useAuthStore.getState().updateUser(user)
    void queryClient.invalidateQueries({ queryKey: userKeys.all })
  }
}
