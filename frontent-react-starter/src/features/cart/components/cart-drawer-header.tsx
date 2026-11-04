import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Đầu ngăn kéo: tiêu đề (`Dialog.Title`, nối `aria-labelledby` của ngăn kéo) kèm số lượng trong ngoặc, nút đóng tròn 44px. */
function CartDrawerHeader({ itemCount }: { itemCount: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-gutter pt-5 pb-3">
      <Dialog.Title className="flex items-baseline gap-2 text-h3 font-semibold text-ink">
        Giỏ hàng của bạn
        {itemCount !== null ? <span className="text-body-sm font-normal text-ink-muted">({itemCount})</span> : null}
      </Dialog.Title>
      <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Đóng giỏ hàng" className="press rounded-4xl bg-surface-sunken" />}>
        <X aria-hidden="true" />
      </Dialog.Close>
    </div>
  )
}

export { CartDrawerHeader }
