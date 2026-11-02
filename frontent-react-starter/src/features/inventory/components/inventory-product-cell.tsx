import { Link } from "react-router-dom"
import { ImagePreview } from "@/components/shared/image-preview"
import { Badge } from "@/components/ui/badge"
import type { InventoryItem } from "../types"

/** Lý do ẩn, dùng cho tooltip và trình đọc màn hình (nhãn hiển thị vẫn chỉ là "Đã ẩn"). */
function hiddenReason(item: InventoryItem): string {
  if (!item.product.isActive && !item.isActive) return "Sản phẩm đang ẩn và biến thể ngừng bán"
  return item.product.isActive ? "Biến thể ngừng bán" : "Sản phẩm đang ẩn"
}

/** Ảnh nhỏ (bấm xem lớn), tên là liên kết tới trang sửa sản phẩm, nhãn chữ "Đã ẩn" nếu hàng đang ẩn. */
function InventoryProductCell({ item }: { item: InventoryItem }) {
  const { product } = item
  return (
    <div className="flex min-w-0 items-center gap-inline">
      <ImagePreview src={product.imageUrl} alt={product.name} shape="portrait" zoomable className="w-9" />
      <div className="flex min-w-0 flex-col items-start gap-1">
        <Link
          to={`/admin/products/${product.id}/edit`}
          className="rounded-xs font-medium text-ink underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {product.name}
        </Link>
        {item.isHidden ? (
          <Badge variant="outline" title={hiddenReason(item)}>
            Đã ẩn
            <span className="sr-only">: {hiddenReason(item)}</span>
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

export { InventoryProductCell }
