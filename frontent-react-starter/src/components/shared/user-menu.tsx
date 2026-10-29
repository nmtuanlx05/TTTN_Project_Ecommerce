import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Camera, LayoutDashboard, LogOut } from "lucide-react"
import { AvatarDialog } from "@/components/shared/avatar-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
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
import type { User } from "@/types/user"

/** Thông tin hiện trong menu. Truyền từ ngoài vào vì components/ không được đọc phiên đăng nhập. */
type UserMenuAccount = {
  /** Tên hiển thị (đã qua `displayName`). */
  name: string
  /** Họ tên gốc, `null` với dữ liệu cũ; chữ cái đầu của avatar tính từ đây để khớp quy tắc của `initialsOf`. */
  fullName: string | null
  email: string
  /** `null` = chưa có ảnh đại diện. */
  avatarUrl: string | null
  roleLabel: string
  /** Chỉ ADMIN/STAFF; ở chính khu quản trị thì để false vì đang ở đó rồi. */
  canAccessAdmin: boolean
}

const ITEM = "min-h-control gap-inline px-3 text-body-sm"

/**
 * Menu tài khoản dùng chung cho storefront và admin. Dưới `sm` chỉ còn icon (vẫn 44px,
 * tên nằm trong aria-label); từ `sm` hiện thêm tên, rút gọn bằng dấu "…" nếu dài.
 *
 * Mục "Ảnh đại diện" mở `AvatarDialog`. Hộp thoại nằm NGOÀI `DropdownMenu` và điều khiển bằng state, vì bấm
 * mục menu đóng menu ngay và hộp thoại nằm trong đó sẽ bị hủy theo.
 */
function UserMenu({
  account,
  onLogout,
  loggingOut = false,
  onAvatarSaved,
}: {
  account: UserMenuAccount
  onLogout: () => void
  loggingOut?: boolean
  /** Gọi với User mới sau khi lưu ảnh đại diện: nơi gọi cập nhật phiên và cache (components/ không đọc phiên). */
  onAvatarSaved: (user: User) => void
}) {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={triggerRef}
              variant="secondary"
              aria-label={`Tài khoản của ${account.name}`}
              className="max-sm:w-control max-sm:px-0"
            />
          }
        >
          <UserAvatar
            avatarUrl={account.avatarUrl}
            name={account.fullName}
            email={account.email}
            size="sm"
            // Nút đã có aria-label và tên bằng chữ; ảnh chỉ để trang trí.
            decorative
          />
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
          <DropdownMenuItem onClick={() => setAvatarOpen(true)} className={ITEM}>
            <Camera />
            Ảnh đại diện
          </DropdownMenuItem>
          <DropdownMenuItem disabled={loggingOut} onClick={onLogout} className={ITEM}>
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AvatarDialog
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        account={{ name: account.fullName, email: account.email, avatarUrl: account.avatarUrl }}
        onSaved={onAvatarSaved}
        finalFocus={triggerRef}
      />
    </>
  )
}

export { UserMenu }
export type { UserMenuAccount }
