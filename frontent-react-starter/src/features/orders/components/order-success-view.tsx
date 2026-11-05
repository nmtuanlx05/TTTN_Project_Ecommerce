import { CircleAlert } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrder } from "../queries"
import { OrderNotFound } from "./order-not-found"
import { SuccessContent } from "./success-content"

/** Tải đơn theo mã trên URL (nên tải lại trang vẫn đúng) rồi hiện thẻ cảm ơn, không tìm thấy, hoặc lỗi + thử lại. */
function OrderSuccessView({ code }: { code: string }) {
  const { data, error, isError, refetch } = useOrder(code)
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
