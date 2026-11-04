import { HomeSection } from "@/components/storefront/home/home-section"
import { ViewAllLink } from "@/components/storefront/view-all-link"
import { HOME } from "@/lib/home-content"
import { HOME_BEST_SELLERS } from "../../home-constants"
import { useBestSellerProducts } from "../../queries"
import { CatalogError } from "../catalog-states"
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
    <HomeSection
      id="home-best-sellers"
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={<ViewAllLink to="/products">{viewAll}</ViewAllLink>}
    >
      {items !== undefined ? (
        <ProductGrid products={items} layout="four-up" eagerCount={0} quickActions />
      ) : query.isError ? (
        <CatalogError onRetry={() => void query.refetch()} />
      ) : (
        <ProductGridSkeleton layout="four-up" count={HOME_BEST_SELLERS} />
      )}
    </HomeSection>
  )
}

export { HomeBestSellers }
