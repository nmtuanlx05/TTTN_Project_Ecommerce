import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHANNEL_SOON_LABEL, PAYMENT_CHANNELS } from "../constants"

/** Chỉ các kênh đang bật; kênh chưa bật (ví điện tử, thẻ) bị ẩn hẳn khỏi giao diện. */
const VISIBLE_CHANNELS = PAYMENT_CHANNELS.filter((channel) => channel.enabled)

/** Kênh đang chọn: kênh bật đầu tiên (chưa cần state vì chỉ có một kênh chạy thật). */
const SELECTED_CHANNEL = VISIBLE_CHANNELS[0]?.id

/**
 * Ô hiện dưới thẻ "Thanh toán online" khi được chọn. Chỉ có MỘT kênh bật (QR ngân hàng) thì không vẽ chip (một chip đã chọn sẵn, không bấm
 * được gì dễ bị hiểu là nút hỏng): hiện tên kênh dạng chữ. Từ hai kênh bật trở lên thì tự quay về dạng "Chọn hình thức" với các chip.
 * Không tự tính hay hứa thời hạn: hạn thanh toán do backend trả ở trang thanh toán.
 */
function PaymentMethodPanel() {
  return (
    <div id="payment-online-panel" className="flex flex-col gap-4 rounded-card bg-surface-sunken/50 p-5">
      {VISIBLE_CHANNELS.length <= 1 ? (
        <h3 className="text-caption font-semibold tracking-wider text-ink uppercase">
          {VISIBLE_CHANNELS[0]?.label ?? "Thanh toán online"}
        </h3>
      ) : (
        <>
          <h3 className="text-caption font-semibold tracking-wider text-ink uppercase">Chọn hình thức</h3>
          <div role="group" aria-label="Chọn hình thức thanh toán online" className="flex flex-wrap gap-2">
            {VISIBLE_CHANNELS.map((channel) => {
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
                  {channel.enabled ? null : (
                    <span className="text-caption font-normal text-ink-muted">{CHANNEL_SOON_LABEL}</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
      <p className="flex items-start gap-3 text-body-sm text-ink-muted">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Sau khi bấm &quot;Đặt hàng&quot;, bạn sẽ được chuyển tới màn hình thanh toán để quét mã QR và hoàn tất giao
          dịch.
        </span>
      </p>
    </div>
  )
}

export { PaymentMethodPanel }
