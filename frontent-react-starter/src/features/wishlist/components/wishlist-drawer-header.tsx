import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Đầu ngăn kéo: tiêu đề (`Dialog.Title`, nối `aria-labelledby` của ngăn kéo) kèm số lượng nhạt trong ngoặc, nút đóng tròn 44px, đường kẻ mảnh bên dưới. */
function WishlistDrawerHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-gutter pt-5 pb-4">
      <Dialog.Title className="flex items-baseline gap-2 text-h3 font-semibold text-ink">
        Sản phẩm yêu thích
        {count > 0 ? <span className="text-body-sm font-normal text-ink-muted">({count})</span> : null}
      </Dialog.Title>
      <Dialog.Close
        render={<Button variant="ghost" size="icon" aria-label="Đóng danh sách yêu thích" className="press rounded-4xl bg-surface-sunken" />}
      >
        <X aria-hidden="true" />
      </Dialog.Close>
    </div>
  )
}

export { WishlistDrawerHeader }
