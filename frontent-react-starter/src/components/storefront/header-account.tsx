import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { UserMenu } from "@/components/shared/user-menu"
import { cn } from "@/lib/utils"
import type { HeaderSession } from "./header-session"

/**
 * Mục tài khoản ở header desktop. Đang tải phiên thì giữ đúng chỗ (không nháy); chưa đăng nhập chỉ có MỘT
 * nút "Đăng nhập" (trang /login đã có liên kết sang /register).
 */
function HeaderAccount({ session }: { session: HeaderSession }) {
  if (session.status === "authenticated") {
    return (
      <UserMenu
        account={session.account}
        onLogout={session.onLogout}
        loggingOut={session.loggingOut}
        onAvatarSaved={session.onAvatarSaved}
      />
    )
  }
  if (session.status === "anonymous") {
    return <Link to="/login" className={cn(buttonVariants(), "press")}>Đăng nhập</Link>
  }
  return <div aria-hidden="true" className="h-control w-28" />
}

export { HeaderAccount }
