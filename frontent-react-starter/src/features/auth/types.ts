import type { User } from "@/types/user"

export type AuthStatus = "loading" | "authenticated" | "anonymous"

export interface LoginInput {
  email: string
  password: string
}

/** Kết quả POST /auth/login (docs/api/auth.md). Refresh token nằm trong cookie, không có ở đây. */
export interface LoginResult {
  accessToken: string
  user: User
}

/** Body POST /auth/register. `name` và `phone` chỉ gửi khi có giá trị; không có `role`. */
export interface RegisterInput {
  email: string
  password: string
  name?: string
  phone?: string
}
