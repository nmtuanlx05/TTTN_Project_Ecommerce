import { Reveal } from "@/components/storefront/reveal"
import { SectionHeading } from "@/components/storefront/section-heading"
import { ViewAllLink } from "@/components/storefront/view-all-link"
import { RELATED_LIMIT } from "../constants"
import { useCatalogProducts } from "../queries"
import type { CatalogProductListItem } from "../types"
import { ProductGrid } from "./product-grid"

/** Bổ sung cần lấy dư vài sản phẩm để vẫn đủ `RELATED_LIMIT` sau khi bỏ trùng với nhóm cùng danh mục (backend chỉ loại được MỘT id mỗi lần gọi). */
const FILL_LIMIT = RELATED_LIMIT * 2

/** Ghép nhóm cùng danh mục (ưu tiên) với nhóm bổ sung, bỏ trùng, cắt đủ `RELATED_LIMIT`. */
function mergeRelated(same: CatalogProductListItem[], extra: CatalogProductListItem[]) {
  const seen = new Set(same.map((product) => product.id))
  return [...same, ...extra.filter((product) => !seen.has(product.id))].slice(0, RELATED_LIMIT)
}

/**
 * "Có thể bạn cũng thích": tối đa 4 thẻ (bật `quickActions`: trái tim yêu thích và "Thêm nhanh"). Ưu tiên cùng danh mục (gồm danh mục con), loại chính sản phẩm đang xem, mới nhất
 * trước; ít hơn 4 thì gọi thêm MỘT lần `GET /products` không lọc danh mục để bổ sung (chỉ khi cần). Thiếu dữ liệu (đang tải, lỗi, không có gì) thì không hiện gì:
 * đây là khối phụ, không đáng chặn hay báo lỗi. "Xem tất cả" về danh sách theo danh mục. Hiện dần khi cuộn tới (một lần); ảnh nằm dưới màn hình đầu nên không thẻ nào `eager`.
 */
function RelatedProducts({
  productId,
  categoryId,
  categorySlug,
}: {
  productId: number
  categoryId: number
  categorySlug: string
}) {
  const { data } = useCatalogProducts({ categoryId, excludeId: productId, limit: RELATED_LIMIT })
  const needFill = data !== undefined && data.items.length < RELATED_LIMIT
  const fill = useCatalogProducts({ excludeId: productId, limit: FILL_LIMIT }, { enabled: needFill })

  if (!data) return null
  // Đang chờ nhóm bổ sung thì chưa hiện, tránh khối nhảy từ ít thẻ sang đủ thẻ.
  if (needFill && !fill.data && !fill.isError) return null
  const products = needFill ? mergeRelated(data.items, fill.data?.items ?? []) : data.items
  if (products.length === 0) return null

  return (
    <Reveal className="mt-block">
      <section aria-labelledby="related-title" className="flex flex-col gap-8">
        <SectionHeading
          id="related-title"
          title="Có thể bạn cũng thích"
          action={<ViewAllLink to={`/products?category=${encodeURIComponent(categorySlug)}`}>Xem tất cả</ViewAllLink>}
        />
        <ProductGrid products={products} layout="four-up" eagerCount={0} quickActions />
      </section>
    </Reveal>
  )
}

export { RelatedProducts }
