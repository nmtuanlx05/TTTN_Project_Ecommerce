import { Reveal } from "@/components/storefront/reveal"
import { RELATED_LIMIT } from "../constants"
import { useCatalogProducts } from "../queries"
import { ProductGrid } from "./product-grid"

/**
 * "Sản phẩm cùng danh mục": cùng danh mục (gồm danh mục con), loại chính sản phẩm đang xem, mới nhất trước. Thiếu dữ liệu
 * (đang tải, lỗi, không có sản phẩm nào khác) thì không hiện gì: đây là khối phụ, không đáng chặn hay báo lỗi. Hiện dần khi
 * cuộn tới (một lần). Ảnh nằm dưới màn hình đầu nên không có thẻ nào `eager`.
 */
function RelatedProducts({ productId, categoryId }: { productId: number; categoryId: number }) {
  const { data } = useCatalogProducts({ categoryId, excludeId: productId, limit: RELATED_LIMIT })
  if (!data || data.items.length === 0) return null

  return (
    <Reveal className="mt-block">
      <section aria-labelledby="related-title" className="flex flex-col gap-8">
        <h2 id="related-title" className="text-h2 text-ink">
          Sản phẩm cùng danh mục
        </h2>
        <ProductGrid products={data.items} layout="full" eagerCount={0} />
      </section>
    </Reveal>
  )
}

export { RelatedProducts }
