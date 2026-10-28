import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { ProductStatusTarget } from "../use-product-status-action"

/** Hộp xác nhận ẩn sản phẩm. `product` được giữ lại khi đóng nên chữ không đổi lúc mờ dần. */
function ProductStatusDialog({
  open,
  product,
  loading,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  product: ProductStatusTarget | null
  loading: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ẩn sản phẩm này?"
      description={
        product ? (
          <>
            <strong className="font-semibold text-ink">{product.name}</strong>{" "}
            <span className="text-ink-muted">({product.slug})</span> sẽ biến mất khỏi cửa hàng và khách
            không mở được trang sản phẩm. Dữ liệu, biến thể và đơn hàng cũ vẫn được giữ; bạn vẫn xem và
            sửa được ở đây, và có thể hiện lại bất cứ lúc nào.
          </>
        ) : null
      }
      confirmLabel="Ẩn sản phẩm"
      destructive
      loading={loading}
      error={error}
      onConfirm={onConfirm}
    />
  )
}

export { ProductStatusDialog }
