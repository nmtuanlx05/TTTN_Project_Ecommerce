import { ShieldAlert } from "lucide-react"
import { PageContainer } from "@/components/storefront/page-container"
import { StateMessage } from "@/components/storefront/state-message"
import { useCurrentRole } from "@/features/auth/use-current-role"
import { CartPageContent } from "@/features/cart/components/cart-page-content"
import { useDocumentTitle } from "@/hooks/use-document-title"

/**
 * /gio-hang — giỏ hàng chi tiết, chỉ CUSTOMER (route bọc `RequireAuth` lo phần đăng nhập). ADMIN/STAFF vào thẳng đường dẫn này chỉ thấy thông báo, KHÔNG gọi API giỏ
 * (backend cũng trả 403): `CartPageContent` chỉ dựng cho CUSTOMER.
 */
function StorefrontCartPage() {
  const role = useCurrentRole()
  useDocumentTitle(role && role !== "CUSTOMER" ? "Giỏ hàng" : null)

  if (role && role !== "CUSTOMER") {
    return (
      <PageContainer className="pt-8 pb-block lg:pt-16">
        <StateMessage
          icon={ShieldAlert}
          title="Tài khoản quản trị không dùng để mua hàng"
          titleAs="h1"
          description="Hãy đăng nhập bằng tài khoản khách hàng để xem giỏ hàng."
        />
      </PageContainer>
    )
  }
  return <CartPageContent />
}

export default StorefrontCartPage
