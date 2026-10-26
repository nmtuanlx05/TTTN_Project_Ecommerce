import { Link } from "react-router-dom"
import { LayoutDashboard, LogOut, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Thông tin hiện trong menu. Truyền từ ngoài vào vì components/ không được đọc phiên đăng nhập. */
type UserMenuAccount = {
  name: string
  email: string
  roleLabel: string
  /** Chỉ ADMIN/STAFF; ở chính khu quản trị thì để false vì đang ở đó rồi. */
  canAccessAdmin: boolean
}

const ITEM = "min-h-control gap-inline px-3 text-body-sm"

/**
 * Menu tài khoản dùng chung cho storefront và admin. Dưới `sm` chỉ còn icon (vẫn 44px,
 * tên nằm trong aria-label); từ `sm` hiện thêm tên, rút gọn bằng dấu "…" nếu dài.
 */
function UserMenu({
  account,
  onLogout,
  loggingOut = false,
}: {
  account: UserMenuAccount
  onLogout: () => void
  loggingOut?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            aria-label={`Tài khoản của ${account.name}`}
            className="max-sm:w-control max-sm:px-0"
          />
        }
      >
        <UserRound />
        <span className="hidden max-w-40 truncate sm:inline">{account.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-3 py-2">
            <span className="truncate text-body-sm font-semibold text-ink">{account.name}</span>
            <span className="truncate text-caption font-normal text-ink-muted">{account.email}</span>
            <span className="text-caption font-normal text-ink-muted">{account.roleLabel}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {account.canAccessAdmin ? (
          <DropdownMenuItem render={<Link to="/admin" />} className={ITEM}>
            <LayoutDashboard />
            Vào trang quản trị
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem disabled={loggingOut} onClick={onLogout} className={ITEM}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { UserMenu }
export type { UserMenuAccount }
