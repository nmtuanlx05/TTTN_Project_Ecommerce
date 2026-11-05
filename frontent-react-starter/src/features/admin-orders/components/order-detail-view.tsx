import { OrderDetailContent } from "./order-detail-content"
import { OrderNotFound } from "./order-not-found"

/** Id trên URL không đáng tin: chỉ nhận số nguyên dương, còn lại coi như không có đơn. */
function OrderDetailView({ rawId }: { rawId: string | undefined }) {
  const id = Number(rawId)
  if (!rawId || !Number.isInteger(id) || id < 1) return <OrderNotFound />
  return <OrderDetailContent key={id} id={id} />
}

export { OrderDetailView }
