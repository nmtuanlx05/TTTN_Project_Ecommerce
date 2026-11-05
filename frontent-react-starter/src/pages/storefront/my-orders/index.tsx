import { AccountShell } from "@/components/storefront/account-shell"
import { useAccountSidebar } from "@/components/storefront/account-context"
import { useCartUi } from "@/components/storefront/cart-ui-context"
import { Breadcrumbs } from "@/components/storefront/breadcrumbs"
import { PageContainer } from "@/components/storefront/page-container"
import { useInvalidateCart } from "@/features/cart/queries"
import { OrdersContent } from "@/features/orders/components/orders-content"
import { useDocumentTitle } from "@/hooks/use-document-title"

/**
 * /tai-khoan/don-hang — danh sách đơn của khách. Trang là nơi ghép: `features/orders` không biết giỏ nên làm mới giỏ và mở ngăn kéo
 * sau khi mua lại được truyền vào qua `onReordered`.
 */
function StorefrontMyOrdersPage() {
  const sidebar = useAccountSidebar()
  const invalidateCart = useInvalidateCart()
  const { openCart } = useCartUi()
  useDocumentTitle("Đơn hàng của tôi")

  return (
    <PageContainer className="pt-8 pb-block lg:pt-12">
      <Breadcrumbs items={[{ label: "Trang chủ", to: "/" }, { label: "Đơn hàng của tôi" }]} />
      <header className="mt-6 mb-8 flex flex-col gap-2">
        <p className="font-serif text-h3 font-normal text-ink-muted italic">Tài khoản của bạn</p>
        <h1 className="text-h1 text-ink uppercase">Đơn hàng của tôi</h1>
      </header>
      <AccountShell sidebar={sidebar}>
        <OrdersContent
          onReordered={() => {
            invalidateCart()
            openCart()
          }}
        />
      </AccountShell>
    </PageContainer>
  )
}

export default StorefrontMyOrdersPage
