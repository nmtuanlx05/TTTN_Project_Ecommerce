import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/** Hiện trong lúc tải mã của một trang nạp muộn (`React.lazy`). Chỉ là vòng quay, không có chữ nhìn thấy. */
function RouteFallback({ className }: { className?: string }) {
  return (
    <div role="status" className={cn("grid place-items-center py-section", className)}>
      <LoaderCircle className="size-5 animate-spin text-ink-muted" aria-hidden="true" />
      <span className="sr-only">Đang tải…</span>
    </div>
  )
}

export { RouteFallback }
