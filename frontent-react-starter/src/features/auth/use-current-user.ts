import type { User } from "@/types/user"
import { useAuthStore } from "./auth-store"

/** User đang đăng nhập, hoặc `null` khi chưa đăng nhập. */
export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user)
}
