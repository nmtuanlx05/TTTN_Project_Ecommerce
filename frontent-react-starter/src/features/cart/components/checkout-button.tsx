import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { STORE } from "@/lib/store-info"

/** "Thanh toán ngay": STUB (toast `STORE.comingSoon.checkout`) cho tới bước đặt đơn. Khóa khi không có dòng nào mua được. */
function CheckoutButton({ disabled }: { disabled: boolean }) {
  const toast = useToast()
  return (
    <Button
      type="button"
      size="lg"
      disabled={disabled}
      onClick={() => toast.add({ title: STORE.comingSoon.checkout, data: { tone: "info" } })}
      className="press rounded-4xl"
    >
      Thanh toán ngay
    </Button>
  )
}

export { CheckoutButton }
