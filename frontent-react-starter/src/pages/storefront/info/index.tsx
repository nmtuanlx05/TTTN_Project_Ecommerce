import { useParams } from "react-router-dom"
import { InfoPageContent } from "@/components/storefront/info-page-content"
import { NotFoundContent } from "@/components/storefront/not-found-content"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { findInfoPage } from "@/lib/info-pages"

/** /thong-tin/:slug: trang thông tin tạm theo cấu hình `lib/info-pages.ts`. Slug lạ thì 404 ngay trong khung storefront. */
function StorefrontInfoPage() {
  const { slug } = useParams()
  const page = findInfoPage(slug)
  useDocumentTitle(page?.title ?? "Không tìm thấy trang")

  return page ? <InfoPageContent page={page} /> : <NotFoundContent />
}

export default StorefrontInfoPage
