import { apiGet, apiSend, refreshSession } from "@/lib/api-client"
import type { User } from "@/types/user"
import type { LoginInput, LoginResult, RegisterInput } from "./types"

/** Gọi API auth (docs/api/auth.md). Chỉ `queries.ts` và `auth-bootstrap.tsx` được import file này. */

/** Đăng ký tạo CUSTOMER, trả về User; không tự đăng nhập, không có token. */
export function register(input: RegisterInput): Promise<User> {
  return apiSend<User>("post", "/auth/register", input)
}

export function login(input: LoginInput): Promise<LoginResult> {
  return apiSend<LoginResult>("post", "/auth/login", input)
}

/**
 * Đổi cookie refresh lấy access token mới (đã được lưu vào store). Dùng chung một
 * promise với interceptor của api-client nên nhiều nơi gọi cùng lúc chỉ gửi một request.
 */
export function refresh(): Promise<string> {
  return refreshSession()
}

export function logout(): Promise<{ message: string }> {
  return apiSend<{ message: string }>("post", "/auth/logout")
}

export function getMe(signal?: AbortSignal): Promise<User> {
  return apiGet<User>("/auth/me", { signal })
}
