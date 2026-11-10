import { useCallback } from "react"
import { usePaymentInfo } from "../queries"
import { PaymentAwaiting } from "./payment-awaiting"
import { PaymentResult } from "./payment-result"
import { PaymentError, PaymentSkeleton } from "./payment-states"

/**
 * Nội dung /thanh-toan-online/:code. Trạng thái hoàn toàn lấy từ backend theo mã trên URL nên tải lại trang giữa chừng vẫn đúng:
 * AWAITING_PAYMENT → QR + đếm ngược (tự hỏi lại); PAID/EXPIRED/CANCELLED → màn kết quả.
 */
function PaymentPageContent({ code }: { code: string }) {
  const { data, error, isError, refetch } = usePaymentInfo(code)
  const recheck = useCallback(() => void refetch(), [refetch])

  if (!data) {
    if (isError) return <PaymentError error={error} code={code} onRetry={recheck} />
    return <PaymentSkeleton />
  }
  if (data.state === "AWAITING_PAYMENT") {
    // `transfer` luôn có khi đang chờ; thiếu thì coi như lỗi tạm và để polling hỏi lại.
    if (!data.transfer) return <PaymentSkeleton />
    return <PaymentAwaiting payment={data} transfer={data.transfer} offline={isError} onRecheck={recheck} />
  }
  return <PaymentResult payment={data} state={data.state} />
}

export { PaymentPageContent }
