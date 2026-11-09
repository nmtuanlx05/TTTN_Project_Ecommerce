import { Banknote, CircleAlert, PackageX, ShieldAlert } from "lucide-react"
import { Link } from "react-router-dom"
import { StateMessage } from "@/components/storefront/state-message"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiError } from "@/lib/api-error"
import { accountOrderPath } from "@/lib/order-paths"
import { cn } from "@/lib/utils"
import { ERROR_CODE } from "../constants"

function PaymentSkeleton() {
  return <Skeleton role="status" aria-label="Đang tải thông tin thanh toán" className="h-[32rem] rounded-panel" />
}

/** ADMIN/STAFF vào trang khách: chỉ thông báo, không gọi API (giống /thanh-toan). */
function PaymentAdminNotice() {
  return (
    <StateMessage
      icon={ShieldAlert}
      title="Tài khoản quản trị không dùng để mua hàng"
      titleAs="h1"
      description="Hãy đăng nhập bằng tài khoản khách hàng để xem thanh toán đơn hàng."
    />
  )
}

/**
 * Lỗi khi tải thông tin thanh toán, theo mã backend:
 * 404 (không có đơn hoặc đơn của người khác) / 409 `ORDER_NOT_ONLINE` (đơn COD) / 409 `PAYMENT_METHOD_NOT_SUPPORTED` (ONLINE đang tắt) / còn lại thử lại.
 */
function PaymentError({ error, code, onRetry }: { error: ApiError; code: string; onRetry: () => void }) {
  if (error.statusCode === 404 || error.code === ERROR_CODE.notFound) {
    return (
      <StateMessage
        icon={PackageX}
        title="Không tìm thấy đơn hàng"
        titleAs="h1"
        description="Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn."
        action={
          <Link to="/products" className={cn(buttonVariants(), "press rounded-4xl")}>
            Tiếp tục mua sắm
          </Link>
        }
      />
    )
  }
  if (error.code === ERROR_CODE.notOnline) {
    return (
      <StateMessage
        icon={Banknote}
        title="Đơn này thanh toán khi nhận hàng"
        titleAs="h1"
        description="Bạn không cần chuyển khoản cho đơn hàng này."
        action={
          <Link to={accountOrderPath(code)} className={cn(buttonVariants(), "press rounded-4xl")}>
            Xem đơn hàng
          </Link>
        }
      />
    )
  }
  if (error.code === ERROR_CODE.notSupported) {
    return (
      <StateMessage
        icon={CircleAlert}
        title="Thanh toán chuyển khoản tạm thời không khả dụng"
        titleAs="h1"
        description="Vui lòng liên hệ cửa hàng kèm mã đơn để được hỗ trợ. Đơn của bạn vẫn được giữ đến hết hạn thanh toán."
        action={
          <Link to={accountOrderPath(code)} className={cn(buttonVariants(), "press rounded-4xl")}>
            Xem đơn hàng
          </Link>
        }
      />
    )
  }
  return (
    <StateMessage
      icon={CircleAlert}
      title="Không tải được thông tin thanh toán"
      titleAs="h1"
      description={error.isNetworkError ? "Kiểm tra kết nối rồi thử lại." : error.message}
      action={
        <Button type="button" variant="secondary" onClick={onRetry} className="press rounded-4xl">
          Thử lại
        </Button>
      }
    />
  )
}

export { PaymentAdminNotice, PaymentError, PaymentSkeleton }
