import type { Voucher } from "../types"
import { usagePercent, usageText } from "../voucher-text"

/** "3 / 100" kèm thanh tiến độ nhỏ; không giới hạn ("3 / ∞") thì không có thanh. Thanh chỉ để nhìn, chữ đã đủ nghĩa. */
function VoucherUsageCell({ voucher }: { voucher: Voucher }) {
  const percent = usagePercent(voucher)
  return (
    <div className="flex flex-col gap-1">
      <span data-numeric className="whitespace-nowrap">
        {usageText(voucher)}
      </span>
      {percent !== null ? (
        <div aria-hidden="true" className="h-1 w-20 overflow-hidden rounded-4xl bg-surface-sunken">
          <div className="h-full rounded-4xl bg-ink" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  )
}

export { VoucherUsageCell }
