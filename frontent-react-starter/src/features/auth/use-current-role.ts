import type { Role } from "@/types/user"
import { useAuthStore } from "./auth-store"

/** Vai trò thật của user đang đăng nhập (đọc từ phiên), `null` khi chưa đăng nhập. */
export function useCurrentRole(): Role | null {
  return useAuthStore((state) => state.user?.role ?? null)
}
