import { SearchX } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useListPath } from "../list-link"

function OrderNotFound() {
  const listPath = useListPath()
  return (
    <EmptyState
      icon={SearchX}
      title="Không tìm thấy đơn hàng"
      description="Đơn này không tồn tại hoặc đường dẫn không đúng."
      action={
        <Button variant="secondary" nativeButton={false} render={<Link to={listPath} />}>
          Về danh sách đơn hàng
        </Button>
      }
    />
  )
}

export { OrderNotFound }
