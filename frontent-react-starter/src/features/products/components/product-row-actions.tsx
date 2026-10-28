import { Eye, EyeOff, Pencil } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { listLinkState } from "../list-link"
import type { ProductListItem } from "../types"

/** Sửa (link sang trang sửa, nhớ bộ lọc hiện tại) và ẩn/hiện ngay trên dòng. */
function ProductRowActions({
  product,
  pending,
  onToggle,
}: {
  product: ProductListItem
  /** Đang chờ phản hồi đổi trạng thái của chính dòng này. */
  pending: boolean
  onToggle: (product: ProductListItem) => void
}) {
  const { search } = useLocation()
  // Icon cho biết TRẠNG THÁI hiện tại (mắt mở = đang hiện, mắt gạch chéo = đang ẩn); nhãn và tooltip
  // nói rõ hành động khi bấm, để người dùng không phải đoán icon là trạng thái hay là nút.
  const ToggleIcon = product.isActive ? Eye : EyeOff
  const toggleLabel = product.isActive
    ? `Ẩn sản phẩm ${product.name}`
    : `Hiện lại sản phẩm ${product.name}`

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        aria-label={`Sửa sản phẩm ${product.name}`}
        title="Sửa sản phẩm"
        render={<Link to={`/admin/products/${product.id}/edit`} state={listLinkState(search)} />}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        loading={pending}
        aria-label={toggleLabel}
        title={product.isActive ? "Đang hiện. Bấm để ẩn" : "Đang ẩn. Bấm để hiện lại"}
        onClick={() => onToggle(product)}
      >
        <ToggleIcon className={product.isActive ? undefined : "text-ink-muted"} />
      </Button>
    </div>
  )
}

export { ProductRowActions }
