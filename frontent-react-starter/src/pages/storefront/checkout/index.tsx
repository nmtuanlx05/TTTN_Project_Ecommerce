import { ShieldAlert } from "lucide-react"
import { CheckoutSteps } from "@/components/storefront/checkout-steps"
import { PageContainer } from "@/components/storefront/page-container"
import { StateMessage } from "@/components/storefront/state-message"
import { useCurrentRole } from "@/features/auth/use-current-role"
import { useCurrentUser } from "@/features/auth/use-current-user"
import { useResetCart } from "@/features/cart/queries"
import { CheckoutContent } from "@/features/checkout/components/checkout-content"
import { useDocumentTitle } from "@/hooks/use-document-title"

/**
 * /thanh-toan — chỉ CUSTOMER (route bọc `RequireAuth` lo đăng nhập, rồi quay lại sau khi đăng nhập). ADMIN/STAFF chỉ thấy thông báo, KHÔNG gọi API.
 * Trang là nơi ghép: `features/checkout` không biết giỏ nên làm mới giỏ sau khi đặt đơn được truyền vào qua `onOrderPlaced`.
 */
function StorefrontCheckoutPage() {
  const role = useCurrentRole()
  const user = useCurrentUser()
  const resetCart = useResetCart()
  useDocumentTitle("Thanh toán")

  if (role && role !== "CUSTOMER") {
    return (
      <PageContainer className="pt-8 pb-block lg:pt-16">
        <StateMessage
          icon={ShieldAlert}
          title="Tài khoản quản trị không dùng để mua hàng"
          titleAs="h1"
          description="Hãy đăng nhập bằng tài khoản khách hàng để thanh toán."
        />
      </PageContainer>
    )
  }
  return (
    <PageContainer className="pt-8 pb-block lg:pt-16">
      <CheckoutSteps current={2} />
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-serif text-h3 font-normal text-ink-muted italic">Hoàn tất đơn hàng của bạn</p>
        <h1 className="text-h1 text-ink uppercase">Thanh toán</h1>
      </header>
      <CheckoutContent user={{ name: user?.name ?? null, phone: user?.phone ?? null }} onOrderPlaced={resetCart} />
    </PageContainer>
  )
}

export default StorefrontCheckoutPage
