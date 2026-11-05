import { useState } from "react"
import { Button } from "@/components/ui/button"
import { VOUCHER_PREVIEW_COUNT } from "../constants"
import { useAvailableVouchers } from "../queries"
import { VoucherCard } from "./voucher-card"

/** "Voucher dành cho bạn": tối đa 3 thẻ, nhiều hơn có "Xem thêm". Lỗi hay rỗng thì ẩn cả khối (không chặn đặt đơn; ô nhập mã vẫn dùng được). */
function VoucherSuggestions({
  subtotal,
  appliedCode,
  busy,
  onApply,
}: {
  subtotal: number
  appliedCode: string | null
  busy: boolean
  onApply: (code: string) => void
}) {
  const { data } = useAvailableVouchers()
  const [expanded, setExpanded] = useState(false)
  if (!data || data.length === 0) return null
  const shown = expanded ? data : data.slice(0, VOUCHER_PREVIEW_COUNT)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-ink-muted">Voucher dành cho bạn</p>
      <ul className="flex flex-col gap-2">
        {shown.map((voucher) => (
          <VoucherCard
            key={voucher.code}
            voucher={voucher}
            subtotal={subtotal}
            selected={voucher.code === appliedCode}
            busy={busy}
            onApply={onApply}
          />
        ))}
      </ul>
      {data.length > VOUCHER_PREVIEW_COUNT ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          className="press self-center"
        >
          {expanded ? "Thu gọn" : `Xem thêm (${data.length - VOUCHER_PREVIEW_COUNT})`}
        </Button>
      ) : null}
    </div>
  )
}

export { VoucherSuggestions }
