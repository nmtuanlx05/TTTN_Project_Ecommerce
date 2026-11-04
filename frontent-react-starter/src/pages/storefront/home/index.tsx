import { AssuranceStrip } from "@/components/storefront/home/assurance-strip"
import { BrandStory } from "@/components/storefront/home/brand-story"
import { CategoryShowcase } from "@/components/storefront/home/category-showcase"
import { HomeHero } from "@/components/storefront/home/home-hero"
import { HomeBestSellers } from "@/features/catalog/components/home/home-best-sellers"
import { HomeNewArrivals } from "@/features/catalog/components/home/home-new-arrivals"
import { useCategoryTree } from "@/hooks/use-category-tree"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { STORE } from "@/lib/store-info"

/**
 * Trang chủ: hero carousel, danh mục nổi bật, best sellers (tạm), câu chuyện thương hiệu, sản phẩm mới về, dải cam kết. Chỉ ghép; mỗi khối tự xử lý
 * rỗng/lỗi và tự bọc `Reveal` (hiện dần một lần cho khối dưới màn hình đầu). Cây danh mục lấy một lần (chung cache với header) rồi truyền xuống.
 */
function StorefrontHomePage() {
  const { tree, isPending } = useCategoryTree()
  useDocumentTitle(STORE.name)

  return (
    <>
      <HomeHero tree={tree} />
      <CategoryShowcase tree={tree} loading={isPending} />
      <HomeBestSellers />
      <BrandStory />
      <HomeNewArrivals tree={tree} />
      <AssuranceStrip />
    </>
  )
}

export default StorefrontHomePage
