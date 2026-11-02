import { useState } from "react"
import { useCategoryTree } from "@/hooks/use-category-tree"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { Breadcrumbs, type BreadcrumbItem } from "@/components/storefront/breadcrumbs"
import { categoryTrail } from "@/lib/category-tree"
import { formatVnd } from "@/lib/format"
import { useCatalogProduct } from "../queries"
import { CatalogError } from "./catalog-states"
import { ProductDetailSkeleton } from "./product-detail-skeleton"
import { ProductGallery } from "./product-gallery"
import { ProductNotFound } from "./product-not-found"
import { PurchasePanel, type AddToCartInput } from "./purchase-panel"
import { RelatedProducts } from "./related-products"

/**
 * Trang /products/:slug. Breadcrumb dựng chuỗi danh mục cha từ cây danh mục; cây chưa có/lỗi thì dùng danh mục của chính
 * sản phẩm. 404 (không tồn tại, ẩn, hết biến thể bán) hiện trang thân thiện; lỗi khác hiện "Thử lại". Cột ảnh/thông tin
 * chia 6/6 từ `md`, 7/5 từ `lg`.
 */
function ProductDetailContent({
  slug,
  onAddToCart,
}: {
  slug: string
  onAddToCart: (input: AddToCartInput) => void
}) {
  const query = useCatalogProduct(slug)
  const { tree } = useCategoryTree()
  // Ô dính đáy màn hình ở cuối trang: nơi `PurchasePanel` portal thanh mua (di động) vào.
  const [barSlot, setBarSlot] = useState<HTMLElement | null>(null)
  const product = query.data

  useDocumentTitle(product ? product.name : query.isError ? "Không tìm thấy sản phẩm" : null)

  let body
  if (product) {
    const trail = tree ? categoryTrail(tree, product.category.id) : []
    const crumbs: BreadcrumbItem[] = [
      { label: "Trang chủ", to: "/" },
      ...(trail.length > 0 ? trail : [product.category]).map((node) => ({
        label: node.name,
        to: `/products?category=${encodeURIComponent(node.slug)}`,
      })),
      { label: product.name },
    ]
    body = (
      <>
        <Breadcrumbs items={crumbs} />
        <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <ProductGallery src={product.imageUrl} alt={product.name} />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-h2 text-ink">{product.name}</h1>
              <p className="text-body font-semibold text-ink">{formatVnd(product.price)}</p>
            </div>
            <PurchasePanel
              key={product.id}
              product={product}
              barSlot={barSlot}
              onAddToCart={onAddToCart}
            />
            {product.description ? (
              <p className="max-w-prose whitespace-pre-line border-t border-border-subtle pt-6 text-body text-ink-muted">
                {product.description}
              </p>
            ) : null}
          </div>
        </div>
        <RelatedProducts productId={product.id} categoryId={product.category.id} />
      </>
    )
  } else if (query.isError) {
    body =
      query.error.statusCode === 404 ? (
        <ProductNotFound />
      ) : (
        <CatalogError onRetry={() => void query.refetch()} />
      )
  } else {
    body = <ProductDetailSkeleton />
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-gutter pt-4 pb-block lg:pt-6">
      {body}
      <div ref={setBarSlot} className="sticky bottom-0 z-30 h-0 md:hidden" />
    </div>
  )
}

export { ProductDetailContent }
