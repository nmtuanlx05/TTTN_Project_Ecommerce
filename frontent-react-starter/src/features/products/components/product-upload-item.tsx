import { Loader2, RotateCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UploadItem } from "../use-multi-image-upload"

/** Một file đang chờ/đang tải/lỗi trong hàng đợi tải ảnh. Lỗi thì ghi rõ lý do; lỗi mạng/server có nút thử lại, lỗi do file chỉ có nút bỏ qua. */
function ProductUploadItem({
  item,
  onRetry,
  onDismiss,
}: {
  item: UploadItem
  onRetry: () => void
  onDismiss: () => void
}) {
  const failed = item.status === "error"
  const state =
    item.status === "uploading"
      ? `Đang tải${item.progress !== null ? ` ${item.progress}%` : "…"}`
      : item.status === "queued"
        ? "Đang chờ tới lượt"
        : null

  return (
    <li className="flex items-center gap-3 rounded-md border border-dashed border-border-default p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm text-ink">{item.file.name}</p>
        {failed ? (
          <p role="alert" className="text-caption text-danger-fg">
            {item.error}
          </p>
        ) : (
          <p aria-live="polite" className="flex items-center gap-1 text-caption text-ink-muted">
            {item.status === "uploading" ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
            {state}
          </p>
        )}
      </div>
      {failed && item.retryable ? (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw />
          Thử lại
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${item.status === "uploading" ? "Hủy tải" : "Bỏ qua"} ${item.file.name}`}
        onClick={onDismiss}
      >
        <X />
      </Button>
    </li>
  )
}

export { ProductUploadItem }
