import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Camera, LayoutDashboard, LogOut } from "lucide-react"
import { AvatarDialog } from "@/components/shared/avatar-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import type { HeaderSession } from "./header-session"

/**
 * Khối tài khoản trong ngăn kéo menu (màn hẹp, nơi header không đủ chỗ cho `UserMenu`). Có đủ những gì
 * `UserMenu` có: vào trang quản trị (admin/staff), đổi ảnh đại diện, đăng xuất. `AvatarDialog` nằm trong ngăn kéo
 * (hộp thoại lồng nhau) và trả focus về nút "Ảnh đại diện" đang nằm trong đó.
 */
function MobileAccount({ session, onNavigate }: { session: HeaderSession; onNavigate: () => void }) {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarButtonRef = useRef<HTMLButtonElement>(null)

  if (session.status === "loading") return <div aria-hidden="true" className="h-control" />
  if (session.status === "anonymous") {
    return (
      <Link to="/login" onClick={onNavigate} className={buttonVariants({ className: "w-full" })}>
        Đăng nhập
      </Link>
    )
  }

  const { account } = session
  return (
    <div className="flex flex-col gap-inline">
      <div className="flex items-center gap-inline px-3">
        <UserAvatar
          avatarUrl={account.avatarUrl}
          name={account.fullName}
          email={account.email}
          size="md"
          decorative
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body-sm font-semibold text-ink">{account.name}</span>
          <span className="truncate text-caption text-ink-muted">{account.email}</span>
        </div>
      </div>
      {account.canAccessAdmin ? (
        <Link
          to="/admin"
          onClick={onNavigate}
          className={buttonVariants({ variant: "ghost", className: "justify-start" })}
        >
          <LayoutDashboard />
          Vào trang quản trị
        </Link>
      ) : null}
      <Button
        ref={avatarButtonRef}
        variant="ghost"
        className="justify-start"
        onClick={() => setAvatarOpen(true)}
      >
        <Camera />
        Ảnh đại diện
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        disabled={session.loggingOut}
        onClick={session.onLogout}
      >
        <LogOut />
        Đăng xuất
      </Button>
      <AvatarDialog
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        account={{ name: account.fullName, email: account.email, avatarUrl: account.avatarUrl }}
        onSaved={session.onAvatarSaved}
        finalFocus={avatarButtonRef}
      />
    </div>
  )
}

export { MobileAccount }
