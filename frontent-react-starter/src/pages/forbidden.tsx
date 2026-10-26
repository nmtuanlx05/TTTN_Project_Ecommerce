import { Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

/** Trang 403. `fullPage` khi đứng một mình, bỏ khi nằm trong khung admin. */
function ForbiddenPage({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div
      className={cn(
        "grid place-items-center",
        fullPage ? "min-h-dvh bg-canvas px-gutter" : "py-section",
      )}
    >
      <EmptyState
        icon={ShieldAlert}
        title="Bạn không có quyền truy cập"
        description="Tài khoản của bạn không được dùng chức năng này. Nếu cần, hãy liên hệ quản trị viên để được cấp quyền."
        action={
          <Link
            to={fullPage ? "/" : "/admin"}
            className={buttonVariants({ variant: "secondary" })}
          >
            {fullPage ? "Về trang chủ" : "Về trang quản trị"}
          </Link>
        }
        className="w-full max-w-md bg-surface"
      />
    </div>
  )
}

export default ForbiddenPage
