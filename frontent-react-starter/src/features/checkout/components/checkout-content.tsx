import { useState } from "react"
import { Navigate } from "react-router-dom"
import { ERROR_CODE, VOUCHER_ERROR_CODES } from "../constants"
import { useApplyVoucher, usePreview } from "../queries"
import { useCheckoutForm } from "../use-checkout-form"
import { CheckoutForm, CHECKOUT_FORM_ID } from "./checkout-form"
import { CheckoutError, CheckoutSkeleton } from "./checkout-states"
import { OrderSummary } from "./order-summary"

/**
 * Nội dung /thanh-toan cho CUSTOMER: cột trái form (7/12), cột phải tóm tắt (5/12, dính). Tiền, giảm giá, phí ship lấy từ `POST /orders/preview`.
 * Giỏ trống (CART_EMPTY) thì về /gio-hang. `user` để điền sẵn họ tên, số điện thoại; `onOrderPlaced` do trang ghép truyền vào để làm mới giỏ.
 */
function CheckoutContent({
  user,
  onOrderPlaced,
}: {
  user: { name: string | null; phone: string | null }
  onOrderPlaced: () => void
}) {
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const preview = usePreview(appliedCode)
  const apply = useApplyVoucher()
  const checkout = useCheckoutForm({
    user,
    appliedCode,
    onVoucherFailure: (message) => {
      setVoucherError(message)
      setAppliedCode(null)
    },
    onPlaced: onOrderPlaced,
  })

  const removeVoucher = () => {
    setAppliedCode(null)
    setVoucherError(null)
  }
  const applyVoucher = (code: string) => {
    apply.mutate(code, {
      onSuccess: (canonical) => {
        setAppliedCode(canonical)
        setVoucherError(null)
      },
      onError: (error) => setVoucherError(error.message),
    })
  }

  const { data, error, isError, refetch } = preview
  if (error?.code === ERROR_CODE.cartEmpty) return <Navigate to="/gio-hang" replace />
  if (!data) {
    if (isError) {
      const voucherCause = appliedCode !== null && VOUCHER_ERROR_CODES.includes(error?.code ?? "")
      return (
        <CheckoutError
          message={error?.message ?? ""}
          onRetry={() => void refetch()}
          onRemoveVoucher={voucherCause ? removeVoucher : undefined}
        />
      )
    }
    return <CheckoutSkeleton />
  }

  const warnings = data.warnings.map((warning) => warning.message)
  const unavailable = checkout.unavailable.length > 0 ? checkout.unavailable : warnings
  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <CheckoutForm checkout={checkout} unavailable={unavailable} />
      </div>
      <div className="lg:col-span-5">
        <OrderSummary
          preview={data}
          formId={CHECKOUT_FORM_ID}
          refreshing={preview.isPlaceholderData}
          pending={checkout.pending}
          canSubmit={data.canCheckout && checkout.wardsReady}
          voucherError={voucherError}
          applying={apply.isPending}
          onApply={applyVoucher}
          onRemove={removeVoucher}
        />
      </div>
    </div>
  )
}

export { CheckoutContent }
