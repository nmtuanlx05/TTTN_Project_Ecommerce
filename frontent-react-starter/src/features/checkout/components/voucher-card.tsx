import { Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import type { AvailableVoucher } from "../types"
import { voucherCondition, voucherTitle } from "../voucher-text"

/** Thẻ voucher viền nét đứt: tiêu đề từ loại và giá trị, dòng điều kiện, mã nhỏ, nút "Áp dụng"/"Đã chọn". Chưa đủ đơn tối thiểu thì khóa kèm gợi ý "Mua thêm X". */
function VoucherCard({
  voucher,
  subtotal,
  selected,
  busy,
  onApply,
}: {
  voucher: AvailableVoucher
  subtotal: number
  selected: boolean
  busy: boolean
  onApply: (code: string) => void
}) {
  // Chỉ để khóa nút và gợi ý; backend vẫn kiểm lại (VOUCHER_MIN_ORDER).
  const missing = voucher.minOrderValue - subtotal
  const tooSmall = missing > 0
  return (
    <li className="flex items-center gap-3 rounded-card border border-dashed border-border-strong p-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xs bg-surface-sunken text-ink-muted"
      >
        <Ticket className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-body-sm font-semibold text-ink">{voucherTitle(voucher)}</p>
        <p className="text-caption text-ink-muted">{voucherCondition(voucher)}</p>
        {tooSmall && !selected ? (
          <p className="text-caption font-semibold text-ink">Mua thêm {formatVnd(missing)} để dùng</p>
        ) : null}
        <p data-numeric className="text-caption text-ink-subtle">
          {voucher.code}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={selected ? "primary" : "secondary"}
        disabled={selected || tooSmall || busy}
        onClick={() => onApply(voucher.code)}
        className="press shrink-0 rounded-4xl"
      >
        {selected ? "Đã chọn" : "Áp dụng"}
      </Button>
    </li>
  )
}

export { VoucherCard }
