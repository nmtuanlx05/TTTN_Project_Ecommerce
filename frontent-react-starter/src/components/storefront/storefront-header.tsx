import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { BrandLogo } from "@/components/shared/brand-logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { UserMenu, type UserMenuAccount } from "@/components/shared/user-menu"
import { cn } from "@/lib/utils"
import type { User } from "@/types/user"

/** Phiên đăng nhập nhìn từ header. Truyền từ ngoài vào vì components/ không được đọc phiên. */
type HeaderSession =
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "authenticated"
      account: UserMenuAccount
      onLogout: () => void
      loggingOut: boolean
      onAvatarSaved: (user: User) => void
    }

/**
 * Header cửa hàng: logo bên trái; bên phải là đổi sáng/tối và một mục tài khoản.
 * Đang tải phiên thì giữ đúng chỗ của mục đó (không nháy); chưa đăng nhập chỉ có một nút
 * "Đăng nhập" (trang /login đã có liên kết sang /register).
 */
function StorefrontHeader({ session }: { session: HeaderSession }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-canvas">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-gutter sm:gap-inline md:h-20">
        <BrandLogo to="/" />
        <div className="flex items-center gap-2 sm:gap-inline">
          <ThemeToggle />
          {session.status === "authenticated" ? (
            <UserMenu
              account={session.account}
              onLogout={session.onLogout}
              loggingOut={session.loggingOut}
              onAvatarSaved={session.onAvatarSaved}
            />
          ) : session.status === "anonymous" ? (
            <Link to="/login" className={cn(buttonVariants(), "max-sm:px-3")}>
              Đăng nhập
            </Link>
          ) : (
            <div aria-hidden="true" className="h-control w-control sm:w-28" />
          )}
        </div>
      </div>
    </header>
  )
}

export { StorefrontHeader }
export type { HeaderSession }
