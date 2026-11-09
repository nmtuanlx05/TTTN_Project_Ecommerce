import { Clock } from "lucide-react"
import { formatDate, formatTime } from "@/lib/format"
import { formatCountdown } from "../use-countdown"

/** Đồng hồ đếm ngược tới hạn thanh toán. Hết giờ thì ghi "đang kiểm tra" (backend quyết định đơn đã hết hạn thật chưa). */
function PaymentCountdown({ remainingMs, expiresAt }: { remainingMs: number | null; expiresAt: string | null }) {
  if (remainingMs === null || !expiresAt) return null
  const over = remainingMs <= 0
  return (
    <div className="flex items-center justify-center gap-3 rounded-card bg-warning-tint px-4 py-3 text-warning-fg">
      <Clock className="size-5 shrink-0" aria-hidden="true" />
      <p className="text-body-sm">
        {over ? (
          "Đã hết thời gian, đang kiểm tra lại với hệ thống…"
        ) : (
          <>
            Đơn được giữ trong <strong data-numeric className="text-body font-semibold">{formatCountdown(remainingMs)}</strong>
          </>
        )}
        <span className="block text-caption">
          Hạn thanh toán: {formatTime(expiresAt)} ngày {formatDate(expiresAt)}
        </span>
      </p>
    </div>
  )
}

export { PaymentCountdown }
