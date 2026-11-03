import { Link } from "react-router-dom"
import { SearchX } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { buttonVariants } from "@/components/ui/button"

/** Sản phẩm không tồn tại, đang ẩn hoặc không còn biến thể đang bán: backend trả 404 chung, ta cũng nói chung. */
function ProductNotFound() {
  return (
    <StateMessage
      icon={SearchX}
      titleAs="h1"
      title="Không tìm thấy sản phẩm"
      description="Sản phẩm này không còn bán hoặc đường dẫn chưa đúng. Xem các sản phẩm khác trong cửa hàng."
      action={<Link to="/products" className={buttonVariants({ variant: "secondary" })}>Về cửa hàng</Link>}
    />
  )
}

export { ProductNotFound }
