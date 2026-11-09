import { useParams } from "react-router-dom"
import { CheckoutSteps } from "@/components/storefront/checkout-steps"
import { PageContainer } from "@/components/storefront/page-container"
import { useCurrentRole } from "@/features/auth/use-current-role"
import { PaymentPageContent } from "@/features/payments/components/payment-page-content"
import { PaymentAdminNotice } from "@/features/payments/components/payment-states"
import { useDocumentTitle } from "@/hooks/use-document-title"

/** /thanh-toan-online/:code — chỉ CUSTOMER (route bọc `RequireAuth`). ADMIN/STAFF chỉ thấy thông báo, KHÔNG gọi API. Dữ liệu từ GET /orders/:code/payment. */
function StorefrontPaymentPage() {
  const { code = "" } = useParams()
  const role = useCurrentRole()
  useDocumentTitle("Thanh toán đơn hàng")

  if (role && role !== "CUSTOMER") {
    return (
      <PageContainer className="pt-8 pb-block lg:pt-16">
        <PaymentAdminNotice />
      </PageContainer>
    )
  }
  return (
    <PageContainer className="pt-8 pb-block lg:pt-16">
      <CheckoutSteps current={2} />
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-serif text-h3 font-normal text-ink-muted italic">Chuyển khoản qua mã QR</p>
        <h1 className="text-h1 text-ink uppercase">
          Thanh toán đơn <span data-numeric>{code}</span>
        </h1>
      </header>
      <PaymentPageContent code={code} />
    </PageContainer>
  )
}

export default StorefrontPaymentPage
