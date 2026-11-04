import { Link } from "react-router-dom"
import { SearchX } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { buttonVariants } from "@/components/ui/button"
import { PageContainer } from "@/components/storefront/page-container"

/**
 * Nội dung 404 của khu khách (một `h1`, hai lối đi tiếp). Dùng chung cho mọi URL không khớp route và cho slug lạ của trang
 * thông tin; trang gọi nó tự đặt tiêu đề tab.
 */
function NotFoundContent() {
  return (
    <PageContainer>
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
    </PageContainer>
  )
}

export { NotFoundContent }
