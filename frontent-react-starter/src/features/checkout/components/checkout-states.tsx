import { CircleAlert } from "lucide-react"
import { Link } from "react-router-dom"
import { StateMessage } from "@/components/storefront/state-message"
import { Alert } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/** Khung chờ lần tải đầu: hai thẻ trái và thẻ phải, cùng tỉ lệ 7/5 như trang thật. */
function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Đang tải thanh toán"
      className="grid gap-8 lg:grid-cols-12 lg:gap-12"
    >
      <div className="flex flex-col gap-8 lg:col-span-7">
        <Skeleton className="h-96 rounded-panel" />
        <Skeleton className="h-48 rounded-panel" />
      </div>
      <Skeleton className="h-[32rem] rounded-panel lg:col-span-5" />
    </div>
  )
}

/** Không xem trước được đơn: nói rõ, cho thử lại. `onRemoveVoucher` có khi lỗi do mã giảm giá đang áp dụng. */
function CheckoutError({
  message,
  onRetry,
  onRemoveVoucher,
}: {
  message: string
  onRetry: () => void
  onRemoveVoucher?: () => void
}) {
  return (
    <StateMessage
      icon={CircleAlert}
      title="Không tải được thông tin thanh toán"
      description={message}
      action={
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onRetry} className="press">
            Thử lại
          </Button>
          {onRemoveVoucher ? (
            <Button type="button" variant="ghost" onClick={onRemoveVoucher} className="press">
              Bỏ mã giảm giá
            </Button>
          ) : null}
        </div>
      }
    />
  )
}

/** Giỏ có dòng không đặt được (hết hàng, ẩn, vượt tồn): liệt kê và dẫn về giỏ để sửa. */
function UnavailableBanner({ messages }: { messages: string[] }) {
  return (
    <Alert variant="warning" title="Một số sản phẩm không thể đặt">
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <Link to="/gio-hang" className={`${buttonVariants({ variant: "secondary", size: "sm" })} press mt-3 w-fit`}>
        Về giỏ hàng
      </Link>
    </Alert>
  )
}

export { CheckoutError, CheckoutSkeleton, UnavailableBanner }
