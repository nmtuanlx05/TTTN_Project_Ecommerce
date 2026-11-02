import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Biểu tượng giỏ hàng ở header. Là nút (không phải liên kết): giỏ chưa có trang, và khách phải qua cổng đăng nhập. */
function CartButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label="Giỏ hàng" onClick={onClick} className="press">
      <ShoppingBag className="size-5" />
    </Button>
  )
}

export { CartButton }
