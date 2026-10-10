import type { User } from "./types"

/** Tên hiển thị của user; dữ liệu cũ chưa có tên thì dùng email. */
export function displayName(user: User): string {
  return user.name ?? user.email
}
