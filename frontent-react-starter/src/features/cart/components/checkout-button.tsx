import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * "Thanh toán ngay": liên kết tới /thanh-toan. Không có dòng nào mua được thì khóa (không còn là liên kết, `aria-disabled`).
 * `onNavigate`: ngăn kéo giỏ truyền hàm đóng ngăn kéo (trang giỏ không cần).
 */
function CheckoutButton({ disabled, onNavigate }: { disabled: boolean; onNavigate?: () => void }) {
  const className = cn(buttonVariants({ size: "lg" }), "press rounded-4xl")
  if (disabled) {
    return (
      <span role="link" aria-disabled="true" className={cn(className, "pointer-events-none opacity-45")}>
        Thanh toán ngay
      </span>
    )
  }
  return (
    <Link to="/thanh-toan" onClick={onNavigate} className={className}>
      Thanh toán ngay
    </Link>
  )
}

export { CheckoutButton }
