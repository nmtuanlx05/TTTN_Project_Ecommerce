import { Boxes, SearchX } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/** Danh sách rỗng: không khớp bộ lọc (mời xóa bộ lọc) hoặc kho chưa có biến thể nào (mời thêm sản phẩm). */
function InventoryEmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return filtered ? (
    <EmptyState
      icon={SearchX}
      title="Không có kết quả khớp"
      description="Không có biến thể nào khớp với bộ lọc hiện tại. Thử từ khóa ngắn hơn hoặc xóa bộ lọc."
      action={
        <Button variant="secondary" onClick={onClear}>
          Xóa bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Boxes}
      title="Kho chưa có biến thể nào"
      description='Biến thể xuất hiện ở đây (tồn 0) ngay khi sản phẩm được tạo. Nếu mọi sản phẩm đang ẩn, hãy bật "Hiện cả hàng đã ẩn".'
      action={
        <Button nativeButton={false} render={<Link to="/admin/products/new" />}>
          Thêm sản phẩm
        </Button>
      }
    />
  )
}

export { InventoryEmptyState }
