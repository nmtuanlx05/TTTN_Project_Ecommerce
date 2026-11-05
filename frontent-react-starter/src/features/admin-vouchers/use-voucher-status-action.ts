import { useToast } from "@/components/ui/toast"
import { useDialogTarget } from "@/hooks/use-dialog-target"
import { useToggleVoucherStatus } from "./queries"
import type { Voucher } from "./types"
import { enabledNote } from "./voucher-text"

/**
 * Luồng bật / tắt voucher. TẮT voucher đang chạy (`status === "ACTIVE"`) phải qua hộp xác nhận; các trường hợp
 * còn lại (bật, hoặc tắt voucher vốn đã không chạy) gọi API ngay. Lỗi chỉ báo toast, hộp xác nhận vẫn mở để thử lại.
 */
export function useVoucherStatusAction() {
  const dialog = useDialogTarget<Voucher>()
  const toggle = useToggleVoucherStatus()
  const toast = useToast()

  function run(voucher: Voucher, isActive: boolean, onDone?: () => void) {
    toggle.mutate(
      { id: voucher.id, isActive },
      {
        onSuccess: (saved) => {
          onDone?.()
          toast.add({
            title: isActive ? "Đã bật voucher" : "Đã tắt voucher",
            description: isActive ? `${saved.code}. ${enabledNote(saved.status, saved.startsAtDate)}` : saved.code,
            data: { tone: "success" },
          })
        },
        onError: (error) =>
          toast.add({
            title: isActive ? "Không bật được voucher" : "Không tắt được voucher",
            description: error.statusCode === 403 ? "Bạn không có quyền quản lý voucher." : error.message,
            data: { tone: "danger" },
          }),
      },
    )
  }

  return {
    request: (voucher: Voucher, isActive: boolean) => {
      if (!isActive && voucher.status === "ACTIVE") dialog.show(voucher)
      else run(voucher, isActive)
    },
    /** id voucher đang chờ phản hồi, để dòng đó hiện trạng thái đang xử lý. */
    togglingId: toggle.isPending ? toggle.variables?.id : undefined,
    dialogProps: {
      ...dialog.dialogProps,
      voucher: dialog.target,
      loading: toggle.isPending,
      onConfirm: () => {
        if (dialog.target) run(dialog.target, false, dialog.hide)
      },
    },
  }
}
