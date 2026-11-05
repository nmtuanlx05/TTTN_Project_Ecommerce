import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { Voucher } from "../types"

/** Xác nhận TẮT voucher đang chạy. `voucher` được giữ lại khi đóng nên chữ không đổi lúc mờ dần. */
function VoucherStatusDialog({
  open,
  voucher,
  loading,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  voucher: Voucher | null
  loading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tắt voucher này?"
      description={
        voucher ? (
          <>
            <strong className="font-mono font-semibold text-ink">{voucher.code}</strong> đang chạy. Sau khi tắt, khách
            không dùng được mã này nữa; đơn đã đặt không bị ảnh hưởng. Bạn có thể bật lại bất cứ lúc nào.
          </>
        ) : null
      }
      confirmLabel="Tắt voucher"
      destructive
      loading={loading}
      onConfirm={onConfirm}
    />
  )
}

export { VoucherStatusDialog }
