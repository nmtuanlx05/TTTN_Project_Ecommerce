import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { Category } from "../types"

/** Hộp xác nhận xóa. `category` được giữ lại khi đóng nên chữ không đổi lúc mờ dần. */
function CategoryDeleteDialog({
  open,
  category,
  loading,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  category: Category | null
  loading: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const isEmpty = category ? category.productCount === 0 && category.childCount === 0 : true

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Xóa danh mục này?"
      description={
        category ? (
          <>
            <strong className="font-semibold text-ink">{category.name}</strong>{" "}
            <span className="text-ink-muted">({category.slug})</span> sẽ bị xóa vĩnh viễn, không
            khôi phục được.{" "}
            {isEmpty
              ? "Danh mục đang trống nên xóa được."
              : `Danh mục hiện còn ${category.productCount} sản phẩm và ${category.childCount} danh mục con; hệ thống sẽ từ chối xóa cho tới khi bạn chuyển hết chúng đi.`}
          </>
        ) : null
      }
      confirmLabel="Xóa danh mục"
      destructive
      loading={loading}
      error={error}
      onConfirm={onConfirm}
    />
  )
}

export { CategoryDeleteDialog }
