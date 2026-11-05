import { Alert } from "@/components/ui/alert"
import type { useCheckoutForm } from "../use-checkout-form"
import { PaymentCard } from "./payment-card"
import { ShippingCard } from "./shipping-card"
import { UnavailableBanner } from "./checkout-states"

export const CHECKOUT_FORM_ID = "checkout-form"

/** Cột trái: banner (hết hàng / lỗi chung) rồi hai thẻ (1) giao hàng, (2) thanh toán. Nút gửi nằm ở thẻ tóm tắt (`form={CHECKOUT_FORM_ID}`). */
function CheckoutForm({
  checkout,
  unavailable,
}: {
  checkout: ReturnType<typeof useCheckoutForm>
  /** Cảnh báo của xem trước (`warnings`) hoặc của lần đặt vừa bị từ chối. */
  unavailable: string[]
}) {
  return (
    <form id={CHECKOUT_FORM_ID} noValidate onSubmit={checkout.submit} className="flex flex-col gap-8">
      {unavailable.length > 0 ? <UnavailableBanner messages={unavailable} /> : null}
      {checkout.formError ? (
        <Alert variant="danger" title="Không đặt được hàng">
          {checkout.formError}
        </Alert>
      ) : null}
      <ShippingCard
        form={checkout.form}
        wards={checkout.wards}
        hasWards={checkout.hasWards}
        onDistrictChange={checkout.changeDistrict}
      />
      <PaymentCard />
    </form>
  )
}

export { CheckoutForm }
