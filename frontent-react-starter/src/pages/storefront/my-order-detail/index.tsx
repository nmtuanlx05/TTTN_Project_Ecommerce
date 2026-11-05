import { useParams } from "react-router-dom"
import { AccountShell } from "@/components/storefront/account-shell"
import { useAccountSidebar } from "@/components/storefront/account-context"
import { useCartUi } from "@/components/storefront/cart-ui-context"
import { Breadcrumbs } from "@/components/storefront/breadcrumbs"
import { PageContainer } from "@/components/storefront/page-container"
import { useInvalidateCart } from "@/features/cart/queries"
import { OrderDetailContent } from "@/features/orders/components/order-detail-content"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { ACCOUNT_ORDERS_PATH } from "@/lib/account-paths"

/** /tai-khoan/don-hang/:code — chi tiết một đơn của khách (đơn của người khác hoặc không có: "Không tìm thấy đơn hàng"). */
function StorefrontMyOrderDetailPage() {
  const { code = "" } = useParams()
  const sidebar = useAccountSidebar()
  const invalidateCart = useInvalidateCart()
  const { openCart } = useCartUi()
  useDocumentTitle(`Đơn ${code}`)

  return (
    <PageContainer className="pt-8 pb-block lg:pt-12">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", to: "/" },
          { label: "Đơn hàng của tôi", to: ACCOUNT_ORDERS_PATH },
          { label: `Đơn ${code}` },
        ]}
      />
      <div className="mt-6">
        <AccountShell sidebar={sidebar}>
          <OrderDetailContent
            code={code}
            onReordered={() => {
              invalidateCart()
              openCart()
            }}
          />
        </AccountShell>
      </div>
    </PageContainer>
  )
}

export default StorefrontMyOrderDetailPage
