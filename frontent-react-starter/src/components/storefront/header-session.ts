import type { UserMenuAccount } from "@/components/shared/user-menu"
import type { User } from "@/types/user"

/** Phiên đăng nhập nhìn từ header. Truyền từ ngoài vào vì components/ không được đọc phiên. */
export type HeaderSession =
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "authenticated"
      account: UserMenuAccount
      onLogout: () => void
      loggingOut: boolean
      onAvatarSaved: (user: User) => void
    }
