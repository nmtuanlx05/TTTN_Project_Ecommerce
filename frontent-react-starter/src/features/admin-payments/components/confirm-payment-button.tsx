import { useState } from "react"
import { Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ConfirmOrderTarget } from "../types"
import { ConfirmPaymentDialog } from "./confirm-payment-dialog"

/** Nút "Xác nhận đã nhận tiền" cho trang chi tiết đơn (trang ghép chỉ render khi là ADMIN và đơn online đang chờ thanh toán). */
function ConfirmPaymentButton({ order }: { order: ConfirmOrderTarget }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Landmark aria-hidden="true" />
        Xác nhận đã nhận tiền
      </Button>
      <ConfirmPaymentDialog open={open} onOpenChange={setOpen} order={order} transaction={null} />
    </>
  )
}

export { ConfirmPaymentButton }
