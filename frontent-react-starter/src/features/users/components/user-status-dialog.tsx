import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { displayName } from "../display-name"
import type { User } from "../types"

/** Hộp xác nhận khóa / mở khóa. `user` được giữ lại khi đóng nên chữ không đổi lúc mờ dần. */
function UserStatusDialog({
  open,
  user,
  loading,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  user: User | null
  loading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user?.isActive === false ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?"}
      description={
        user ? (
          <>
            <strong className="font-semibold text-ink">{displayName(user)}</strong>
            {user.name ? ` (${user.email})` : null}{" "}
            {user.isActive
              ? "sẽ không đăng nhập được nữa. Dữ liệu và lịch sử đơn hàng vẫn được giữ, bạn có thể mở khóa lại bất cứ lúc nào."
              : "sẽ đăng nhập và dùng tài khoản được trở lại như trước. Dữ liệu và lịch sử đơn hàng không bị thay đổi."}
          </>
        ) : null
      }
      confirmLabel={user?.isActive === false ? "Mở khóa tài khoản" : "Khóa tài khoản"}
      destructive={user?.isActive !== false}
      loading={loading}
      onConfirm={onConfirm}
    />
  )
}

export { UserStatusDialog }
