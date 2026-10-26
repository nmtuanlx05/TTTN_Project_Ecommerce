import { Shirt } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { HomeHero } from "@/components/storefront/home-hero"

/**
 * Nền trang chủ storefront. Khi có features/products, thay khối EmptyState bằng danh sách sản phẩm.
 */
function StorefrontHomePage() {
  return (
    <>
      <HomeHero />
      <section className="mx-auto w-full max-w-7xl px-gutter pb-section">
        <EmptyState
          icon={Shirt}
          title="Sản phẩm sắp ra mắt"
          description="Bộ sưu tập đầu tiên đang được hoàn thiện. Hãy quay lại sau."
        />
      </section>
    </>
  )
}

export default StorefrontHomePage
