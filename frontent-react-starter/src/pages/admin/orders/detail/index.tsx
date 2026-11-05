import { useParams } from "react-router-dom"
import { OrderDetailView } from "@/features/admin-orders/components/order-detail-view"

function OrderDetailPage() {
  const { id } = useParams()
  return <OrderDetailView rawId={id} />
}

export default OrderDetailPage
