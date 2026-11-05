import { FormDialog } from "@/components/shared/form-dialog"
import type { Voucher } from "../types"
import { useVoucherSave } from "../use-voucher-save"
import { VoucherEditLoader } from "./voucher-edit-loader"
import { VoucherForm } from "./voucher-form"

/** Hộp thoại Tạo (`voucher === null`) và Sửa voucher. Giữ `busy` để không đóng được khi đang gọi API. */
function VoucherFormDialog({
  open,
  voucher,
  onOpenChange,
}: {
  open: boolean
  voucher: Voucher | null
  onOpenChange: (open: boolean) => void
}) {
  const { submit, busy } = useVoucherSave(voucher, () => onOpenChange(false))
  const close = () => onOpenChange(false)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={voucher ? "Sửa voucher" : "Thêm voucher"}
      description={
        voucher
          ? "Cập nhật điều kiện áp dụng. Một số mục bị khóa khi voucher đã có người dùng."
          : "Tạo mã giảm giá cho khách nhập khi đặt hàng. Voucher mới được bật ngay."
      }
    >
      {voucher ? (
        <VoucherEditLoader voucher={voucher} busy={busy} onCancel={close} onSubmit={submit} />
      ) : (
        <VoucherForm detail={null} busy={busy} onCancel={close} onSubmit={submit} />
      )}
    </FormDialog>
  )
}

export { VoucherFormDialog }
