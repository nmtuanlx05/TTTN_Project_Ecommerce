import { CircleAlert } from "lucide-react"
import { Navigate } from "react-router-dom"
import { StateMessage } from "@/components/storefront/state-message"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { orderPaymentPath } from "@/lib/order-paths"
import { useOrder } from "../queries"
import { OrderNotFound } from "./order-not-found"
import { SuccessContent } from "./success-content"

/** Tải đơn theo mã trên URL (nên tải lại trang vẫn đúng) rồi hiện thẻ cảm ơn, không tìm thấy, hoặc lỗi + thử lại. */
function OrderSuccessView({ code }: { code: string }) {
  const { data, error, isError, refetch } = useOrder(code)
  // Đơn online còn chờ chuyển khoản chưa phải "đặt hàng thành công": đưa khách tới trang QR để thanh toán.
  if (data?.status === "PENDING_PAYMENT" && data.paymentMethod === "ONLINE") {
    return <Navigate to={orderPaymentPath(data.code)} replace />
  }
  if (data) return <SuccessContent order={data} />
  if (isError && error.statusCode === 404) return <OrderNotFound />
  if (isError) {
    return (
      <StateMessage
        icon={CircleAlert}
        title="Không tải được đơn hàng"
        description="Kiểm tra kết nối rồi thử lại."
        action={
          <Button type="button" variant="secondary" onClick={() => void refetch()} className="press">
            Thử lại
          </Button>
        }
      />
    )
  }
  return <Skeleton role="status" aria-label="Đang tải đơn hàng" className="mx-auto h-96 max-w-xl rounded-panel" />
}

export { OrderSuccessView }
