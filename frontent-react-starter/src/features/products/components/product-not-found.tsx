import { PackageX } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useListPath } from "../list-link"

/** Id trên URL không hợp lệ hoặc backend trả 404 cho sản phẩm. */
function ProductNotFound() {
  const listPath = useListPath()
  return (
    <EmptyState
      icon={PackageX}
      title="Không tìm thấy sản phẩm"
      description="Sản phẩm này không tồn tại hoặc đường dẫn bị sai. Quay về danh sách để chọn lại."
      action={
        <Button nativeButton={false} render={<Link to={listPath} />}>
          Về danh sách sản phẩm
        </Button>
      }
    />
  )
}

export { ProductNotFound }
