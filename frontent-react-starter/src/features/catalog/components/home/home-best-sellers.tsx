import { CircleAlert } from "lucide-react"
import { PageContainer } from "@/components/storefront/page-container"
import { Reveal } from "@/components/storefront/reveal"
import { SectionHeading } from "@/components/storefront/section-heading"
import { StateMessage } from "@/components/storefront/state-message"
import { ViewAllLink } from "@/components/storefront/view-all-link"
import { Button } from "@/components/ui/button"
import { HOME } from "@/lib/home-content"
import { HOME_BEST_SELLERS } from "../../home-constants"
import { useBestSellerProducts } from "../../queries"
import { ProductGrid } from "../product-grid"
import { ProductGridSkeleton } from "../product-grid-skeleton"

const { eyebrow, title, description, viewAll } = HOME.bestSellers

/**
 * "Best sellers" (TẠM: dữ liệu là các sản phẩm tạo sớm nhất, xem `useBestSellerProducts`): 4 thẻ `ProductCard` (2 cột di động, 4 cột từ `md`).
 * Nằm dưới màn hình đầu nên không thẻ nào `eager`. Rỗng thì ẩn cả khối; lỗi thì hiện trạng thái có "Thử lại" (không làm vỡ cả trang).
 */
function HomeBestSellers() {
  const query = useBestSellerProducts()
  const items = query.data?.items
  if (items?.length === 0) return null

  return (
    <Reveal className="mt-block">
      <PageContainer>
        <section aria-labelledby="home-best-sellers" className="flex flex-col gap-8">
          <SectionHeading
            id="home-best-sellers"
            eyebrow={eyebrow}
            title={title}
            description={description}
            action={<ViewAllLink to="/products">{viewAll}</ViewAllLink>}
          />
          {items !== undefined ? (
            <ProductGrid products={items} layout="four-up" eagerCount={0} />
          ) : query.isError ? (
            <StateMessage
              icon={CircleAlert}
              title="Không tải được sản phẩm"
              description="Kết nối bị gián đoạn hoặc máy chủ đang bận. Thử lại sau giây lát."
              action={
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  Thử lại
                </Button>
              }
            />
          ) : (
            <ProductGridSkeleton layout="four-up" count={HOME_BEST_SELLERS} />
          )}
        </section>
      </PageContainer>
    </Reveal>
  )
}

export { HomeBestSellers }
