import { useEffect, useId, useRef, type ReactNode } from "react"
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileDrop } from "@/hooks/use-file-drop"
import { useImageUpload } from "@/hooks/use-image-upload"
import {
  ACCEPTED_IMAGE_LABEL,
  IMAGE_INPUT_ACCEPT,
  IMAGE_UPLOAD_RULES,
} from "@/lib/image-rules"
import { cn } from "@/lib/utils"
import type { ImageUploadKind } from "@/types/upload"
import { ImagePreview } from "./image-preview"
import { ImageUploadMessage } from "./image-upload-message"
import { ImageUploadProgress } from "./image-upload-progress"

/**
 * Ô chọn và upload MỘT ảnh, dùng chung cho sản phẩm và (sau này) ảnh đại diện. Chỉ gọi
 * `POST /uploads/<kind>` rồi trả URL qua `onChange`; việc lưu URL vào dữ liệu do form làm.
 *
 * - `value` là URL hiện tại (kể cả URL ngoài), `null` = chưa có ảnh. Hiển thị được mọi URL.
 * - "Xóa ảnh" chỉ đặt `onChange(null)`, KHÔNG xóa file trên server.
 * - Upload lỗi thì `value` giữ nguyên, lỗi hiện ngay dưới khung.
 * - `error` là lỗi từ bên ngoài (vd. form báo URL không hợp lệ); lỗi của chính lần upload được ưu tiên.
 * - `onUploadingChange` để form khóa nút gửi trong lúc đang tải.
 * - `fallback` thay ô trống mặc định của khung xem trước (avatar hiện chữ cái đầu).
 * - `zoomable` (mặc định bật) cho bấm vào ảnh để xem lớn; tắt khi ô nằm trong hộp thoại để khỏi lồng hai hộp thoại.
 */
function ImageUploadField({
  value,
  onChange,
  kind,
  shape,
  label,
  error,
  disabled = false,
  zoomable = true,
  fallback,
  onUploadingChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
  kind: ImageUploadKind
  shape: "square" | "circle"
  label: string
  error?: string
  disabled?: boolean
  zoomable?: boolean
  fallback?: ReactNode
  onUploadingChange?: (uploading: boolean) => void
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useImageUpload({ kind, onUploaded: onChange })
  const locked = disabled || upload.isUploading
  const drop = useFileDrop({ disabled: locked, onFiles: upload.selectFiles })
  const rules = IMAGE_UPLOAD_RULES[kind]
  const message = upload.error ?? error
  const hasImage = Boolean(value) || upload.previewUrl !== null

  useEffect(() => {
    onUploadingChange?.(upload.isUploading)
  }, [upload.isUploading, onUploadingChange])

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-body-sm font-medium text-ink">
        {label}
      </span>

      <div
        role="group"
        aria-labelledby={`${id}-label`}
        {...drop.dropProps}
        className={cn(
          "flex flex-col gap-stack rounded-md border border-dashed p-card transition-colors sm:flex-row sm:items-center",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
          drop.isDragging
            ? "border-ink bg-surface-hover"
            : "border-border-strong bg-transparent",
        )}
      >
        <ImagePreview
          src={upload.previewUrl ?? value}
          alt={`${label} (xem trước)`}
          shape={shape}
          showFallbackText
          // Đang tải thì ảnh trong khung là bản xem trước tạm: chưa xem lớn được.
          zoomable={zoomable && !upload.isUploading}
          fallback={fallback}
          className={shape === "circle" ? "size-32" : "size-40"}
        >
          {upload.isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <LoaderCircle className="size-6 animate-spin text-ink" aria-hidden="true" />
            </div>
          ) : null}
          {drop.isDragging ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/90 p-2 text-center text-caption font-medium text-ink">
              Thả ảnh để tải lên
            </div>
          ) : null}
        </ImagePreview>

        <div className="flex min-w-0 flex-1 flex-col gap-inline">
          <div className="flex flex-wrap items-center gap-inline">
            <Button
              type="button"
              variant="secondary"
              loading={upload.isUploading}
              disabled={disabled}
              aria-describedby={message ? `${id}-message` : undefined}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus />
              {hasImage ? "Đổi ảnh" : "Chọn ảnh"}
            </Button>
            {upload.isUploading ? (
              <Button type="button" variant="ghost" onClick={upload.cancel}>
                Hủy
              </Button>
            ) : value ? (
              <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>
                <Trash2 />
                Xóa ảnh
              </Button>
            ) : null}
          </div>

          {upload.isUploading ? (
            <ImageUploadProgress progress={upload.progress} />
          ) : (
            <p className="text-caption text-ink-muted">
              Kéo ảnh vào khung này hoặc bấm {hasImage ? "Đổi ảnh" : "Chọn ảnh"}. {ACCEPTED_IMAGE_LABEL},
              tối đa {rules.maxLabel}.
            </p>
          )}
        </div>

        {/* Input thật bị ẩn và bỏ khỏi thứ tự Tab: nút "Chọn/Đổi ảnh" là cửa vào bằng bàn phím. */}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_INPUT_ACCEPT}
          disabled={locked}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            // Xóa giá trị để chọn lại đúng file vừa rồi vẫn bắn sự kiện change.
            event.target.value = ""
            upload.selectFiles(files)
          }}
        />
      </div>

      <ImageUploadMessage
        id={`${id}-message`}
        error={message}
        status={upload.isUploading ? "Đang tải ảnh lên" : upload.succeeded ? "Đã tải ảnh lên" : ""}
      />
    </div>
  )
}

export { ImageUploadField }
