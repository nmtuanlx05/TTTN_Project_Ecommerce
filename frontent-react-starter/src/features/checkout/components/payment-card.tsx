import { Banknote, CreditCard } from "lucide-react"
import { RadioCard } from "@/components/shared/radio-card"
import type { PaymentMethod, PaymentMethodAvailability } from "../types"
import { CheckoutCard } from "./checkout-card"
import { PaymentMethodPanel } from "./payment-method-panel"

const ONLINE_DESCRIPTION = "Chuyển khoản ngân hàng bằng mã QR (VietQR)."

/**
 * Thẻ (2) "Phương thức thanh toán": COD hoặc thanh toán online (chuyển khoản VietQR). Online bị tắt (chưa cấu hình hoặc tổng đơn 0đ) thì thẻ mờ,
 * không chọn được và hiện đúng `reason` của backend ngay trên thẻ (không đợi tới lúc đặt mới báo lỗi). Chọn online thì mở ô giải thích bước tiếp theo (`PaymentMethodPanel`).
 */
function PaymentCard({
  method,
  online,
  onChange,
}: {
  method: PaymentMethod
  online: PaymentMethodAvailability
  onChange: (method: PaymentMethod) => void
}) {
  const onlineChosen = method === "ONLINE" && online.enabled
  return (
    <CheckoutCard step={2} title="Phương thức thanh toán">
      <div role="radiogroup" aria-label="Phương thức thanh toán" className="flex flex-col gap-stack">
        <RadioCard
          checked={method === "COD"}
          title="Thanh toán khi nhận hàng (COD)"
          description="Trả tiền mặt cho nhân viên giao hàng khi nhận được sản phẩm."
          icon={<Banknote className="size-5" aria-hidden="true" />}
          onSelect={() => onChange("COD")}
        />
        <RadioCard
          checked={onlineChosen}
          unavailable={!online.enabled}
          title="Thanh toán online"
          description={online.enabled ? ONLINE_DESCRIPTION : (online.reason ?? "Thanh toán online hiện chưa khả dụng, vui lòng chọn COD.")}
          icon={<CreditCard className="size-5" aria-hidden="true" />}
          onSelect={() => (online.enabled ? onChange("ONLINE") : undefined)}
        />
        {onlineChosen ? <PaymentMethodPanel /> : null}
      </div>
    </CheckoutCard>
  )
}

export { PaymentCard }
