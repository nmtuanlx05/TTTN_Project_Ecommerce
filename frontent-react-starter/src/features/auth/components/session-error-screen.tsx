import { WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/** Hiện khi không khôi phục được phiên vì mạng hoặc máy chủ lỗi (khác với "chưa đăng nhập"). */
function SessionErrorScreen({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-gutter">
      <EmptyState
        icon={WifiOff}
        title="Chưa kiểm tra được phiên đăng nhập"
        description={`${message} Bấm Thử lại khi đã kết nối.`}
        action={<Button onClick={onRetry}>Thử lại</Button>}
        className="w-full max-w-md bg-surface"
      />
    </div>
  )
}

export { SessionErrorScreen }
