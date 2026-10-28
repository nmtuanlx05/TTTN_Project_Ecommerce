import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useListPath } from "../list-link"

/** Về danh sách sản phẩm, giữ lại bộ lọc và trang nếu người dùng đến từ danh sách. */
function ProductBackLink() {
  const listPath = useListPath()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-fit"
      nativeButton={false}
      render={<Link to={listPath} />}
    >
      <ArrowLeft />
      Danh sách sản phẩm
    </Button>
  )
}

export { ProductBackLink }
