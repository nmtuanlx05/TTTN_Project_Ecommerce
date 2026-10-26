import { useToast } from "@/components/ui/toast"
import { useDialogTarget } from "@/hooks/use-dialog-target"
import { displayName } from "@/lib/display-name"
import { useToggleUserStatus } from "./queries"
import type { User } from "@/types/user"

/**
 * Luồng khóa / mở khóa tài khoản: cả hai đều phải qua hộp xác nhận. Xong thì đóng
 * hộp và báo bằng toast; lỗi thì chỉ báo, hộp vẫn mở để thử lại.
 */
export function useUserStatusAction() {
  const dialog = useDialogTarget<User>()
  const toggleStatus = useToggleUserStatus()
  const toast = useToast()

  function confirm() {
    const user = dialog.target
    if (!user) return
    const isActive = user.isActive === false
    toggleStatus.mutate(
      { id: user.id, isActive },
      {
        onSuccess: () => {
          dialog.hide()
          toast.add({
            title: isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
            description: displayName(user),
            data: { tone: "success" },
          })
        },
        onError: (apiError) =>
          toast.add({
            title: isActive ? "Không mở khóa được" : "Không khóa được",
            description: apiError.message,
            data: { tone: "danger" },
          }),
      },
    )
  }

  return {
    request: (user: User) => dialog.show(user),
    /** id user đang chờ phản hồi, để dòng đó hiện trạng thái đang xử lý. */
    togglingId: toggleStatus.isPending ? toggleStatus.variables?.id : undefined,
    dialogProps: {
      ...dialog.dialogProps,
      user: dialog.target,
      loading: toggleStatus.isPending,
      onConfirm: confirm,
    },
  }
}
