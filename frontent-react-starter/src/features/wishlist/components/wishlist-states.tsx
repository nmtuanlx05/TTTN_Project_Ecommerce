import type { ReactNode } from "react"
import { CircleAlert, Heart } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/** Khung chờ lần tải đầu: bốn thẻ cùng tỉ lệ ảnh 3:4, hai cột như lưới thật. */
function WishlistSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải danh sách yêu thích" role="status" className="grid grid-cols-2 gap-x-4 gap-y-6">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <Skeleton className="aspect-[3/4] w-full rounded-card" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-1 h-11 w-full rounded-4xl" />
        </div>
      ))}
    </div>
  )
}

/** Không lấy được danh sách (và chưa có dữ liệu cũ để hiện): nói rõ và cho thử lại. */
function WishlistError({ onRetry }: { onRetry: () => void }) {
  return (
    <StateMessage
      icon={CircleAlert}
      title="Không tải được danh sách yêu thích"
      description="Kiểm tra kết nối rồi thử lại."
      action={
        <Button type="button" variant="secondary" onClick={onRetry} className="press">
          Thử lại
        </Button>
      }
    />
  )
}

/** Chưa có sản phẩm yêu thích. `action` là nút "Khám phá sản phẩm" do ngăn kéo dựng (đóng ngăn kéo rồi dẫn tới /products). */
function WishlistEmpty({ action }: { action: ReactNode }) {
  return (
    <StateMessage
      icon={Heart}
      title="Chưa có sản phẩm yêu thích"
      description="Bấm vào trái tim trên sản phẩm bạn thích để lưu lại đây."
      action={action}
    />
  )
}

export { WishlistEmpty, WishlistError, WishlistSkeleton }
