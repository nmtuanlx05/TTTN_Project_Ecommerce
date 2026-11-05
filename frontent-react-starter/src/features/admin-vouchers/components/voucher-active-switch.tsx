import { Switch } from "@/components/ui/switch"
import type { Voucher } from "../types"

/**
 * Công tắc bật/tắt một voucher. Phản ánh đúng `isActive` (đã lưu), không phải trạng thái suy ra: voucher có thể bật
 * nhưng đã hết hạn. Không đổi giao diện trước khi server trả lời; `busy` thì khóa để tránh bấm chồng.
 */
function VoucherActiveSwitch({
  voucher,
  disabled,
  onToggle,
}: {
  voucher: Voucher
  disabled: boolean
  onToggle: (voucher: Voucher, isActive: boolean) => void
}) {
  return (
    <Switch
      checked={voucher.isActive}
      disabled={disabled}
      aria-label={`Bật/tắt voucher ${voucher.code}`}
      onCheckedChange={(next) => onToggle(voucher, next)}
    />
  )
}

export { VoucherActiveSwitch }
