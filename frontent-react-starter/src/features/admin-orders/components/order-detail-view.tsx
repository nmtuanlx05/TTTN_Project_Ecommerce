import { OrderDetailContent, type PaymentActionRenderer } from "./order-detail-content"
import { OrderNotFound } from "./order-not-found"

/** Id trên URL không đáng tin: chỉ nhận số nguyên dương, còn lại coi như không có đơn. */
function OrderDetailView({
  rawId,
  isAdmin,
  renderPaymentAction,
}: {
  rawId: string | undefined
  /** Vai trò thật do trang ghép đọc từ phiên (features không import `features/auth`). */
  isAdmin: boolean
  renderPaymentAction?: PaymentActionRenderer
}) {
  const id = Number(rawId)
  if (!rawId || !Number.isInteger(id) || id < 1) return <OrderNotFound />
  return <OrderDetailContent key={id} id={id} isAdmin={isAdmin} renderPaymentAction={renderPaymentAction} />
}

export { OrderDetailView }
