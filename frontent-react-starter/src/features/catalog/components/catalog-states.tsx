import { Link } from "react-router-dom"
import { CircleAlert, PackageOpen, SearchX } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { Button, buttonVariants } from "@/components/ui/button"

/** Slug trên URL không khớp danh mục nào. Không gọi API sản phẩm. */
function CategoryNotFound() {
  return (
    <StateMessage
      icon={SearchX}
      title="Không tìm thấy danh mục"
      description="Danh mục này không tồn tại hoặc đã được đổi tên. Quay lại cửa hàng để chọn danh mục khác."
      action={<Link to="/products" className={buttonVariants({ variant: "secondary" })}>Về cửa hàng</Link>}
    />
  )
}

function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <StateMessage
      icon={CircleAlert}
      title="Không tải được sản phẩm"
      description="Kết nối bị gián đoạn hoặc máy chủ đang bận. Thử lại sau giây lát."
      action={<Button variant="secondary" onClick={onRetry}>Thử lại</Button>}
    />
  )
}

/** Danh mục có thật nhưng chưa có sản phẩm đang bán (API danh mục không có cờ ẩn). */
function CategoryEmpty() {
  return (
    <StateMessage
      icon={PackageOpen}
      title="Danh mục này chưa có sản phẩm"
      description="Sản phẩm mới sẽ sớm được thêm vào. Xem các sản phẩm khác trong cửa hàng."
      action={<Link to="/products" className={buttonVariants({ variant: "secondary" })}>Xem tất cả sản phẩm</Link>}
    />
  )
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <StateMessage
      icon={SearchX}
      title="Không có sản phẩm phù hợp"
      description="Thử bỏ bớt bộ lọc hoặc đổi từ khóa."
      action={<Button variant="secondary" onClick={onClear}>Xóa bộ lọc</Button>}
    />
  )
}

function StoreEmpty() {
  return (
    <StateMessage
      icon={PackageOpen}
      title="Chưa có sản phẩm"
      description="Bộ sưu tập đang được hoàn thiện. Hãy quay lại sau."
    />
  )
}

/** Địa chỉ có `?page=` vượt quá tổng số trang (vd. link cũ, hoặc sản phẩm vừa bị ẩn). */
function PageOutOfRange({ onFirstPage }: { onFirstPage: () => void }) {
  return (
    <StateMessage
      icon={SearchX}
      title="Trang này không có sản phẩm"
      description="Có thể danh sách đã thay đổi. Quay lại trang đầu để xem tiếp."
      action={<Button variant="secondary" onClick={onFirstPage}>Về trang 1</Button>}
    />
  )
}

export { CatalogError, CategoryEmpty, CategoryNotFound, NoMatches, PageOutOfRange, StoreEmpty }
