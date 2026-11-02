import { HomeHero } from "@/features/catalog/components/home-hero"
import { HomeNewArrivals } from "@/features/catalog/components/home-new-arrivals"
import { BrandStatement } from "@/components/storefront/brand-statement"
import { CategoryTiles } from "@/components/storefront/category-tiles"
import { Reveal } from "@/components/storefront/reveal"
import { useCategoryTree } from "@/hooks/use-category-tree"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { STORE } from "@/lib/store-info"

/**
 * Trang chủ: hero, danh mục cấp 1, sản phẩm mới, dải tuyên bố. Khối dưới hero dùng `Reveal` (hiện dần một lần; khối đã nằm trong
 * màn hình lúc vào trang thì hiện ngay). Khối danh mục ẩn khi cây danh mục lỗi hoặc rỗng (header đã tự giảm cấp).
 */
function StorefrontHomePage() {
  const { tree, isPending } = useCategoryTree()
  useDocumentTitle(STORE.name)

  const roots = tree?.roots ?? []
  const showCategories = isPending || roots.length > 0

  return (
    <div className="mx-auto w-full max-w-7xl px-gutter pt-8 pb-block lg:pt-16">
      <HomeHero />
      {showCategories ? (
        <Reveal className="mt-block">
          <CategoryTiles categories={tree ? roots : null} />
        </Reveal>
      ) : null}
      <Reveal className="mt-block">
        <HomeNewArrivals />
      </Reveal>
      <Reveal className="mt-block">
        <BrandStatement />
      </Reveal>
    </div>
  )
}

export default StorefrontHomePage
