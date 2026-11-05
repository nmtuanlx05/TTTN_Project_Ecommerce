import { PackageX } from "lucide-react"
import { Link } from "react-router-dom"
import { StateMessage } from "@/components/storefront/state-message"
import { buttonVariants } from "@/components/ui/button"

/** Đơn không có hoặc thuộc người khác (backend trả 404 như nhau). */
function OrderNotFound() {
  return (
    <StateMessage
      icon={PackageX}
      title="Không tìm thấy đơn hàng"
      titleAs="h1"
      description="Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn."
      action={
        <Link to="/" className={buttonVariants({ variant: "secondary" })}>
          Về trang chủ
        </Link>
      }
    />
  )
}

export { OrderNotFound }
