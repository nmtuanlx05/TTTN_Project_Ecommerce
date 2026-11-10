import { useParams } from "react-router-dom"
import { ConfirmPaymentButton } from "@/features/admin-payments/components/confirm-payment-button"
import { OrderDetailView } from "@/features/admin-orders/components/order-detail-view"
import { useCurrentRole } from "@/features/auth/use-current-role"

/**
 * Chi tiết đơn quản trị. Trang này ghép hai feature: `admin-orders` (đơn) và `admin-payments` (nút "Xác nhận đã nhận tiền", chỉ ADMIN),
 * vì features không import lẫn nhau.
 */
function OrderDetailPage() {
  const { id } = useParams()
  const isAdmin = useCurrentRole() === "ADMIN"
  return (
    <OrderDetailView
      rawId={id}
      isAdmin={isAdmin}
      renderPaymentAction={(order) => <ConfirmPaymentButton order={order} />}
    />
  )
}

export default OrderDetailPage
