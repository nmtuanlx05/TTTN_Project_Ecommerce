import { NotFoundContent } from "@/components/storefront/not-found-content"
import { useDocumentTitle } from "@/hooks/use-document-title"

/**
 * 404 của khu khách: nằm TRONG khung storefront (có header, footer) với tiêu đề tab và `h1`. Mọi URL không khớp route nào
 * (ngoài /admin, có 404 riêng trong khung admin) rơi vào đây.
 */
function StorefrontNotFoundPage() {
  useDocumentTitle("Không tìm thấy trang")

  return <NotFoundContent />
}

export default StorefrontNotFoundPage
