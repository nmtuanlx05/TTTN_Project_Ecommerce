import { Link } from "react-router-dom"
import { SearchX } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { buttonVariants } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"

/**
 * 404 của khu khách: nằm TRONG khung storefront (có header, footer) với tiêu đề tab và `h1`. Mọi URL không khớp route nào
 * (ngoài /admin, có 404 riêng trong khung admin) rơi vào đây.
 */
function StorefrontNotFoundPage() {
  useDocumentTitle("Không tìm thấy trang")

  return (
    <div className="mx-auto w-full max-w-7xl px-gutter">
      <StateMessage
        icon={SearchX}
        titleAs="h1"
        title="Không tìm thấy trang"
        description="Đường dẫn này không tồn tại hoặc đã được chuyển đi. Kiểm tra lại địa chỉ, hoặc quay về trang chủ."
        action={
          <div className="flex flex-wrap items-center justify-center gap-inline">
            <Link to="/" className={buttonVariants()}>
              Về trang chủ
            </Link>
            <Link to="/products" className={buttonVariants({ variant: "secondary" })}>
              Xem cửa hàng
            </Link>
          </div>
        }
      />
    </div>
  )
}

export default StorefrontNotFoundPage
