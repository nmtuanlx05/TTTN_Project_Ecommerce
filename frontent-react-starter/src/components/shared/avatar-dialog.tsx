import { useState, type RefObject } from "react"
import type { User } from "@/types/user"
import { AvatarForm } from "./avatar-form"
import { FormDialog } from "./form-dialog"

/**
 * Hộp thoại đổi ảnh đại diện của chính mình. Phải đặt NGOÀI `DropdownMenuContent` và điều khiển bằng state: mục
 * menu đóng menu ngay khi bấm, nếu hộp thoại nằm trong menu thì bị hủy theo. `finalFocus` trả focus về nút mở
 * menu vì mục menu đã bị gỡ khỏi DOM lúc đóng.
 */
function AvatarDialog({
  open,
  onOpenChange,
  account,
  onSaved,
  finalFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: { name: string | null; email: string; avatarUrl: string | null }
  onSaved: (user: User) => void
  finalFocus: RefObject<HTMLElement | null>
}) {
  const [busy, setBusy] = useState(false)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title="Ảnh đại diện"
      description="Chọn ảnh mới hoặc xóa ảnh hiện tại. Ảnh chỉ thay đổi sau khi bạn bấm Lưu."
      finalFocus={finalFocus}
    >
      <AvatarForm
        {...account}
        onSaved={onSaved}
        onClose={() => onOpenChange(false)}
        onBusyChange={setBusy}
      />
    </FormDialog>
  )
}

export { AvatarDialog }
