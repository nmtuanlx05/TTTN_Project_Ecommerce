import { WifiOff } from "lucide-react"
import { useEffect, useRef } from "react"
import { Alert } from "@/components/ui/alert"
import { formatVnd } from "@/lib/format"
import { useCountdown } from "../use-countdown"
import type { OrderPayment, TransferInfo } from "../types"
import { PaymentCopyRow } from "./payment-copy-row"
import { PaymentCountdown } from "./payment-countdown"
import { PaymentGuide } from "./payment-guide"
import { PaymentQr } from "./payment-qr"

/**
 * Màn "đang chờ chuyển khoản": QR + đếm ngược bên trái, thông tin chuyển khoản + hướng dẫn bên phải (một cột dưới `lg`).
 * Đếm ngược về 0 thì hỏi lại backend đúng một lần cho mỗi hạn; QR vẫn hiện tới khi backend trả `EXPIRED`.
 * `offline`: lần hỏi gần nhất lỗi mạng (giữ dữ liệu cũ, vẫn tiếp tục thử).
 */
function PaymentAwaiting({
  payment,
  transfer,
  offline,
  onRecheck,
}: {
  payment: OrderPayment
  transfer: TransferInfo
  offline: boolean
  onRecheck: () => void
}) {
  const remaining = useCountdown(payment.expiresAt, true)
  const firedFor = useRef<string | null>(null)
  useEffect(() => {
    if (remaining === 0 && payment.expiresAt && firedFor.current !== payment.expiresAt) {
      firedFor.current = payment.expiresAt
      onRecheck()
    }
  }, [remaining, payment.expiresAt, onRecheck])

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
      <section
        aria-label="Mã QR chuyển khoản"
        className="flex flex-col gap-5 rounded-panel border border-border-subtle bg-surface-raised p-6 sm:p-8 lg:col-span-5"
      >
        <PaymentCountdown remainingMs={remaining} expiresAt={payment.expiresAt} />
        <PaymentQr payload={transfer.qrPayload} orderCode={payment.orderCode} />
        <p className="text-center text-caption text-ink-muted">Quét bằng app ngân hàng bất kỳ hỗ trợ VietQR</p>
      </section>
      <div className="flex flex-col gap-6 lg:col-span-7">
        {offline ? (
          <Alert variant="warning" title="Mất kết nối">
            <span className="inline-flex items-center gap-2">
              <WifiOff className="size-4" aria-hidden="true" />
              Đang thử kết nối lại, mã QR vẫn dùng được.
            </span>
          </Alert>
        ) : null}
        <section aria-label="Thông tin chuyển khoản" className="rounded-panel bg-surface-sunken/50 p-6 sm:p-8">
          <h2 className="mb-2 text-h3 font-semibold text-ink">Thông tin chuyển khoản</h2>
          <dl>
            <PaymentCopyRow
              label="Số tiền"
              value={formatVnd(payment.amount)}
              copyValue={String(payment.amount)}
              copyLabel="Sao chép số tiền"
              highlight
            />
            <PaymentCopyRow
              label="Nội dung chuyển khoản"
              value={transfer.content}
              copyLabel="Sao chép nội dung chuyển khoản"
              highlight
            />
            <PaymentCopyRow label="Ngân hàng" value={transfer.bank.name} />
            <PaymentCopyRow
              label="Số tài khoản"
              value={transfer.accountNo}
              copyLabel="Sao chép số tài khoản"
            />
            <PaymentCopyRow label="Chủ tài khoản" value={transfer.accountName} />
          </dl>
        </section>
        <section aria-label="Hướng dẫn thanh toán" className="rounded-panel border border-border-subtle bg-surface-raised p-6 sm:p-8">
          <h2 className="mb-4 text-h3 font-semibold text-ink">Cách thanh toán</h2>
          <PaymentGuide orderCode={payment.orderCode} />
        </section>
      </div>
    </div>
  )
}

export { PaymentAwaiting }
