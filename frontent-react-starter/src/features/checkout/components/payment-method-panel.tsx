import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHANNEL_SOON_LABEL, PAYMENT_CHANNELS } from "../constants"

/** Kênh đang chọn: kênh bật đầu tiên (hiện chỉ có một, nên chưa cần state). */
const SELECTED_CHANNEL = PAYMENT_CHANNELS.find((channel) => channel.enabled)?.id

/**
 * Ô "Chọn hình thức" hiện dưới thẻ "Thanh toán online" khi được chọn. Kênh chưa bật hiện mờ kèm nhãn "Sắp có" và không bấm được.
 * Không tự tính hay hứa thời hạn: hạn thanh toán do backend trả ở trang thanh toán.
 */
function PaymentMethodPanel() {
  return (
    <div id="payment-online-panel" className="flex flex-col gap-4 rounded-card bg-surface-sunken/50 p-5">
      <h3 className="text-caption font-semibold tracking-wider text-ink uppercase">Chọn hình thức</h3>
      <div role="group" aria-label="Chọn hình thức thanh toán online" className="flex flex-wrap gap-2">
        {PAYMENT_CHANNELS.map((channel) => {
          const selected = channel.id === SELECTED_CHANNEL
          return (
            <button
              key={channel.id}
              type="button"
              disabled={!channel.enabled}
              aria-pressed={channel.enabled ? selected : undefined}
              className={cn(
                "press inline-flex min-h-control items-center gap-2 rounded-4xl border px-5 text-body-sm font-medium",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border-control bg-surface text-ink disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {channel.label}
              {channel.enabled ? null : <span className="text-caption font-normal text-ink-muted">{CHANNEL_SOON_LABEL}</span>}
            </button>
          )
        })}
      </div>
      <p className="flex items-start gap-3 text-body-sm text-ink-muted">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>Sau khi bấm &quot;Đặt hàng&quot;, bạn sẽ được chuyển tới màn hình thanh toán để quét mã QR và hoàn tất giao dịch.</span>
      </p>
    </div>
  )
}

export { PaymentMethodPanel }
