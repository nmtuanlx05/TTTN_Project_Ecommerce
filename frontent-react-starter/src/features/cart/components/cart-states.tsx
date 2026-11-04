import { CircleAlert, ShoppingBag } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

/** Khung chờ lần tải đầu của giỏ (chưa có dữ liệu trong cache): ba dòng cùng tỉ lệ ảnh 3:4 như dòng thật. */
function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải giỏ hàng" role="status" className="flex flex-col">
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex gap-4 border-b border-border-subtle py-[18px]">
          <Skeleton className="aspect-[3/4] w-20 shrink-0 rounded-card" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="mt-3 h-11 w-28 rounded-4xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Không lấy được giỏ (và chưa có dữ liệu cũ để hiện): nói rõ và cho thử lại. */
function CartError({ onRetry }: { onRetry: () => void }) {
  return (
    <StateMessage
      icon={CircleAlert}
      title="Không tải được giỏ hàng"
      description="Kiểm tra kết nối rồi thử lại."
      action={
        <Button type="button" variant="secondary" onClick={onRetry} className="press">
          Thử lại
        </Button>
      }
    />
  )
}

/** Giỏ rỗng. `onContinue` đóng ngăn kéo (hoặc dẫn về /products ở trang giỏ). */
function CartEmpty({ action }: { action: React.ReactNode }) {
  return (
    <StateMessage
      icon={ShoppingBag}
      title="Giỏ hàng của bạn đang trống"
      description="Hãy chọn vài món bạn thích rồi quay lại đây nhé."
      action={action}
    />
  )
}

export { CartEmpty, CartError, CartSkeleton }
