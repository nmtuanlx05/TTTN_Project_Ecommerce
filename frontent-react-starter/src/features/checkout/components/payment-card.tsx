import { Banknote, CreditCard } from "lucide-react"
import { RadioCard } from "@/components/shared/radio-card"
import { useToast } from "@/components/ui/toast"
import { STORE } from "@/lib/store-info"
import { CheckoutCard } from "./checkout-card"

/** Thẻ (2) "Phương thức thanh toán". COD chọn sẵn; "Thanh toán online" hiện đủ nhưng không chọn được (backend mới có COD), bấm chỉ báo "sắp có". */
function PaymentCard() {
  const toast = useToast()
  return (
    <CheckoutCard step={2} title="Phương thức thanh toán">
      <div role="radiogroup" aria-label="Phương thức thanh toán" className="flex flex-col gap-stack">
        <RadioCard
          checked
          title="Thanh toán khi nhận hàng (COD)"
          description="Trả tiền mặt cho nhân viên giao hàng khi nhận được sản phẩm."
          icon={<Banknote className="size-5" aria-hidden="true" />}
          onSelect={() => undefined}
        />
        <RadioCard
          checked={false}
          unavailable
          title="Thanh toán online"
          description="Quét mã QR ngân hàng, ví điện tử hoặc thẻ ATM / Visa."
          icon={<CreditCard className="size-5" aria-hidden="true" />}
          onSelect={() => toast.add({ title: STORE.comingSoon.onlinePayment, data: { tone: "info" } })}
        />
      </div>
    </CheckoutCard>
  )
}

export { PaymentCard }
