import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import type { ApiError } from "@/lib/api-error"
import type { User } from "@/types/user"
import { login, logout, register } from "./api"
import { useAuthStore } from "./auth-store"
import type { LoginInput, LoginResult, RegisterInput } from "./types"

/**
 * Đăng nhập. Thành công thì mở phiên; việc chuyển trang do `RedirectIfAuthenticated`
 * làm khi thấy status chuyển sang authenticated (một chỗ duy nhất quyết định trang đích).
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation<LoginResult, ApiError, LoginInput>({
    mutationFn: login,
    // Không giữ `variables` (có mật khẩu) trong cache sau khi form đóng.
    gcTime: 0,
    onSuccess: ({ accessToken, user }) => {
      // Cache của người dùng trước (nếu có) không được lọt sang phiên mới.
      queryClient.clear()
      useAuthStore.getState().startSession(accessToken, user)
    },
  })
}

/** Đăng ký. Không mở phiên: thành công thì form chuyển sang /login. */
export function useRegister() {
  return useMutation<User, ApiError, RegisterInput>({
    mutationFn: register,
    // Không giữ `variables` (có mật khẩu) trong cache sau khi form đóng.
    gcTime: 0,
  })
}

/**
 * Đăng xuất: gọi /auth/logout (lỗi mạng cũng bỏ qua, phía client vẫn thoát), chuyển
 * /login rồi xóa phiên và cache.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      try {
        await logout()
      } catch {
        // Cookie có thể chưa xóa được; token trong bộ nhớ vẫn bị bỏ ở onSettled.
      }
    },
    onSettled: () => {
      navigate("/login", { replace: true })
      useAuthStore.getState().clearSession()
      queryClient.clear()
    },
  })
}
