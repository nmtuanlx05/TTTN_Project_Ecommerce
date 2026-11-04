import { StoreList } from "@/components/storefront/store-list"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { STORE } from "@/lib/store-info"
import { PageContainer } from "@/components/storefront/page-container"

/** /dia-chi: danh sách cửa hàng từ `STORE.stores` (lib/store-info.ts). Một `h1` duy nhất; tiêu đề trang viết hoa như các trang khác. */
function StorefrontStoresPage() {
  useDocumentTitle("Địa chỉ")

  return (
    <PageContainer className="pt-8 pb-block lg:pt-16">
      <h1 className="mb-8 text-h1 text-ink uppercase">Địa chỉ</h1>
      <StoreList stores={STORE.stores} />
    </PageContainer>
  )
}

export default StorefrontStoresPage
