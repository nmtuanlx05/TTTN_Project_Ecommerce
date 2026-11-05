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
      /** Mục "Đơn hàng của tôi" trong menu (chỉ CUSTOMER); `count` là số đơn đang hoạt động, 0 thì không hiện huy hiệu. */
      ordersLink?: { count: number }
    }
