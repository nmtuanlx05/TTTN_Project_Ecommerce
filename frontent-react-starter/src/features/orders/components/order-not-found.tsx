import { PackageX } from "lucide-react"
import { Link } from "react-router-dom"
import { StateMessage } from "@/components/storefront/state-message"
import { buttonVariants } from "@/components/ui/button"
import { MY_ORDERS_PATH } from "../constants"

/** Đơn không có hoặc thuộc người khác (backend trả 404 như nhau). */
function OrderNotFound() {
  return (
    <StateMessage
      icon={PackageX}
      title="Không tìm thấy đơn hàng"
      titleAs="h1"
      description="Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn."
      action={
        <Link to={MY_ORDERS_PATH} className={buttonVariants({ variant: "secondary" })}>
          Xem đơn hàng của tôi
        </Link>
      }
    />
  )
}

export { OrderNotFound }
