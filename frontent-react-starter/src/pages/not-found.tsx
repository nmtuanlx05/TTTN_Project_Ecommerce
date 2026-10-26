import { Link } from "react-router-dom"
import { SearchX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

/** Trang 404. `fullPage` khi đứng một mình, bỏ khi nằm trong khung admin. */
function NotFoundPage({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div
      className={cn(
        "grid place-items-center",
        fullPage ? "min-h-dvh bg-canvas px-gutter" : "py-section",
      )}
    >
      <EmptyState
        icon={SearchX}
        title="Không tìm thấy trang"
        description="Đường dẫn này không tồn tại hoặc đã được chuyển đi. Kiểm tra lại địa chỉ, hoặc quay về trang chủ."
        action={
          <Link to="/" className={buttonVariants({ variant: "secondary" })}>
            Về trang chủ
          </Link>
        }
        className="w-full max-w-md bg-surface"
      />
    </div>
  )
}

export default NotFoundPage
