import { Heart, LogOut, ReceiptText } from "lucide-react"
import { NavLink } from "react-router-dom"
import { UserAvatar } from "@/components/shared/user-avatar"
import { ACCOUNT_ORDERS_PATH } from "@/lib/account-paths"
import { cn } from "@/lib/utils"

const ITEM =
  "flex min-h-control w-full shrink-0 items-center gap-2.5 rounded-card px-3 text-left text-body-sm whitespace-nowrap transition-colors duration-(--motion-fast) ease-smooth hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"

/**
 * Thanh bên tài khoản: thẻ avatar chữ cái + tên + email, rồi "Đơn hàng của tôi" (đang chọn theo URL), "Sản phẩm yêu thích" (mở ngăn kéo yêu thích qua
 * `onWishlistClick`, như trái tim ở header) và "Đăng xuất". Dưới `lg` thu thành dải một hàng cuộn ngang, ẩn email.
 */
function AccountSidebar({
  account,
  onLogout,
  loggingOut,
  onWishlistClick,
}: {
  account: { name: string; fullName: string | null; email: string; avatarUrl: string | null }
  onLogout: () => void
  loggingOut: boolean
  onWishlistClick: () => void
}) {
  return (
    <aside aria-label="Tài khoản của bạn">
      <div className="scrollbar-soft flex flex-col gap-4 rounded-panel border border-border-subtle bg-surface-raised p-card max-lg:flex-row max-lg:items-center max-lg:gap-3 max-lg:overflow-x-auto max-lg:p-3">
        <div className="flex min-w-0 items-center gap-3 border-b border-border-subtle pb-4 max-lg:shrink-0 max-lg:border-b-0 max-lg:border-r max-lg:pr-3 max-lg:pb-0">
          <UserAvatar avatarUrl={account.avatarUrl} name={account.fullName} email={account.email} size="lg" decorative />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm font-semibold text-ink max-lg:max-w-32">{account.name}</span>
            <span className="truncate text-caption text-ink-muted max-lg:hidden">{account.email}</span>
          </div>
        </div>
        <nav aria-label="Menu tài khoản" className="flex flex-col gap-1 max-lg:flex-row">
          <NavLink
            to={ACCOUNT_ORDERS_PATH}
            className={({ isActive }) => cn(ITEM, isActive && "bg-surface-sunken font-medium")}
          >
            <ReceiptText aria-hidden="true" className="size-4 shrink-0" />
            Đơn hàng của tôi
          </NavLink>
          <button type="button" aria-haspopup="dialog" onClick={onWishlistClick} className={ITEM}>
            <Heart aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate">Sản phẩm yêu thích</span>
          </button>
          <button type="button" disabled={loggingOut} onClick={onLogout} className={ITEM}>
            <LogOut aria-hidden="true" className="size-4 shrink-0" />
            Đăng xuất
          </button>
        </nav>
      </div>
    </aside>
  )
}

export { AccountSidebar }
