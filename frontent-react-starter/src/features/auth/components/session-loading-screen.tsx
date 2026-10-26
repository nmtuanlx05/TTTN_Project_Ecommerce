import { LoaderCircle } from "lucide-react"
import { BrandLogo } from "@/components/shared/brand-logo"

/** Màn hình chờ toàn trang trong lúc khôi phục phiên đăng nhập. */
function SessionLoadingScreen() {
  return (
    <div
      role="status"
      className="grid min-h-dvh place-items-center bg-canvas px-gutter text-ink"
    >
      <div className="flex flex-col items-center gap-stack">
        <BrandLogo />
        <LoaderCircle className="size-5 animate-spin text-ink-muted" aria-hidden="true" />
        <p className="text-body-sm text-ink-muted">Đang khôi phục phiên đăng nhập…</p>
      </div>
    </div>
  )
}

export { SessionLoadingScreen }
