import { Link } from "react-router-dom"
import { SearchX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/** Trang 404 trong khung admin. 404 của khu khách nằm ở `pages/storefront/not-found`. */
function NotFoundPage() {
  return (
    <div className="grid place-items-center py-section">
      <EmptyState
        icon={SearchX}
        title="Không tìm thấy trang"
        description="Đường dẫn này không tồn tại hoặc đã được chuyển đi. Kiểm tra lại địa chỉ, hoặc quay về trang chủ."
        action={
          <Link to="/" className={buttonVariants({ variant: "secondary" })}>
            Về trang chủ
          </Link>
        }
        className="w-full max-w-md bg-surface"
      />
    </div>
  )
}

export default NotFoundPage
