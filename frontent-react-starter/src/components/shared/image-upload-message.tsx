import { CircleAlert } from "lucide-react"

/**
 * Lỗi dưới khung ảnh và thông báo cho trình đọc màn hình. Cả hai vùng `aria-live` luôn có trong DOM
 * (kể cả khi trống) để thay đổi nội dung được đọc lên.
 */
function ImageUploadMessage({
  id,
  error,
  status,
}: {
  id: string
  error: string | undefined
  /** Nội dung chỉ dành cho trình đọc màn hình, vd. "Đang tải ảnh lên". */
  status: string
}) {
  return (
    <>
      <div id={id} aria-live="polite">
        {error ? (
          <p className="flex items-start gap-1.5 text-caption text-danger-fg">
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </>
  )
}

export { ImageUploadMessage }
