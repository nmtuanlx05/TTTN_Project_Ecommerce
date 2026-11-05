import { useParams } from "react-router-dom"
import { CheckoutSteps } from "@/components/storefront/checkout-steps"
import { PageContainer } from "@/components/storefront/page-container"
import { StateMessage } from "@/components/storefront/state-message"
import { ShieldAlert } from "lucide-react"
import { useCurrentRole } from "@/features/auth/use-current-role"
import { OrderSuccessView } from "@/features/orders/components/order-success-view"
import { useDocumentTitle } from "@/hooks/use-document-title"

/** /dat-hang-thanh-cong/:code — chỉ CUSTOMER (route bọc `RequireAuth`); dữ liệu lấy từ GET /orders/:code. Bước 3 "Hoàn tất". */
function StorefrontOrderSuccessPage() {
  const { code = "" } = useParams()
  const role = useCurrentRole()
  useDocumentTitle("Đặt hàng thành công")

  if (role && role !== "CUSTOMER") {
    return (
      <PageContainer className="pt-8 pb-block lg:pt-16">
        <StateMessage icon={ShieldAlert} title="Tài khoản quản trị không dùng để mua hàng" titleAs="h1" />
      </PageContainer>
    )
  }
  return (
    <PageContainer className="pt-8 pb-block lg:pt-16">
      <CheckoutSteps current={3} />
      <OrderSuccessView code={code} />
    </PageContainer>
  )
}

export default StorefrontOrderSuccessPage
