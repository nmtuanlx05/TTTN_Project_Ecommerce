import type { RefObject } from "react"
import { useRef } from "react"
import { StorefrontDialog } from "@/components/storefront/storefront-dialog"
import { Button } from "@/components/ui/button"
import { useClearCart } from "../queries"

/**
 * Hộp thoại xác nhận "Xoá tất cả". Xóa xong thì đóng và đưa focus về tiêu đề trang (`returnFocusTo`), vì nút "Xoá tất cả" biến mất cùng giỏ.
 * `onCleared` để trang báo cho trình đọc màn hình.
 */
function ClearCartConfirm({
  open,
  onOpenChange,
  returnFocusTo,
  onCleared,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusTo: RefObject<HTMLElement | null>
  onCleared: () => void
}) {
  const clear = useClearCart()
  const cleared = useRef(false)

  return (
    <StorefrontDialog
      open={open}
      onOpenChange={(next) => (clear.isPending ? undefined : onOpenChange(next))}
      title="Xóa tất cả sản phẩm?"
      description="Mọi sản phẩm sẽ bị xóa khỏi giỏ hàng của bạn."
      finalFocus={() => (cleared.current ? returnFocusTo.current : true)}
    >
      <div className="flex flex-col-reverse gap-3 p-gutter sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={clear.isPending} onClick={() => onOpenChange(false)} className="press">
          Hủy
        </Button>
        <Button
          type="button"
          variant="destructive"
          loading={clear.isPending}
          onClick={() =>
            clear.mutate(undefined, {
              onSuccess: () => {
                cleared.current = true
                onCleared()
                onOpenChange(false)
              },
            })
          }
          className="press"
        >
          Xóa tất cả
        </Button>
      </div>
    </StorefrontDialog>
  )
}

export { ClearCartConfirm }
