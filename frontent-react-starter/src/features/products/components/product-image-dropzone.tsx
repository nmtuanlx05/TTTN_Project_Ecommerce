import { useEffect, useRef, type Ref } from "react"
import { ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFileDrop } from "@/hooks/use-file-drop"
import { ACCEPTED_IMAGE_LABEL, IMAGE_INPUT_ACCEPT, IMAGE_UPLOAD_RULES } from "@/lib/image-rules"
import { cn } from "@/lib/utils"
import { MAX_PRODUCT_IMAGES } from "../constants"

/**
 * Vùng kéo-thả file ảnh sản phẩm (sự kiện kéo-thả gốc của trình duyệt, qua `useFileDrop`). Bấm vào vùng hoặc nút "Tải ảnh lên" mở hộp chọn file; bàn phím
 * dùng nút (Tab tới, Enter/Space): nút không có onClick riêng mà nổi bọt lên vùng nên hộp chọn chỉ mở một lần. Chưa có ảnh thì vùng to, có ảnh thì thu gọn
 * nhưng vẫn nhận file. Đủ ảnh (`free <= 0`) thì khóa: nút vô hiệu, thả file không được nhận. Việc kiểm file và hàng đợi do `onFiles` (useMultiImageUpload) lo.
 * Lúc form đang mở, thả file RƠI RA NGOÀI vùng cũng bị chặn mặc định, nếu không trình duyệt rời trang để mở file ảnh.
 */
function ProductImageDropzone({
  count,
  free,
  empty,
  onFiles,
  buttonRef,
}: {
  /** Số ảnh đã có, hiển thị `n/6`. */
  count: number
  /** Số ảnh còn thêm được (đã trừ ảnh có sẵn và file đang chờ tải). */
  free: number
  /** Chưa có ảnh và chưa có file nào trong hàng đợi: vùng hiện to, thay cho dòng "Chưa có ảnh nào". */
  empty: boolean
  onFiles: (files: File[]) => void
  buttonRef: Ref<HTMLButtonElement>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const locked = free <= 0
  const drop = useFileDrop({ disabled: locked, onFiles })

  useEffect(() => {
    const blockNavigation = (event: DragEvent) => {
      if (Array.from(event.dataTransfer?.types ?? []).includes("Files")) event.preventDefault()
    }
    window.addEventListener("dragover", blockNavigation)
    window.addEventListener("drop", blockNavigation)
    return () => {
      window.removeEventListener("dragover", blockNavigation)
      window.removeEventListener("drop", blockNavigation)
    }
  }, [])

  const prompt = locked
    ? `Đã đủ ${MAX_PRODUCT_IMAGES} ảnh. Xóa bớt ảnh để thêm ảnh khác.`
    : drop.isDragging
      ? "Thả ảnh để tải lên"
      : "Kéo thả ảnh vào đây hoặc bấm để chọn"

  return (
    <div
      role="group"
      aria-label="Vùng tải ảnh sản phẩm"
      data-dragging={drop.isDragging || undefined}
      data-locked={locked || undefined}
      {...drop.dropProps}
      onClick={() => {
        if (!locked) inputRef.current?.click()
      }}
      className={cn(
        "flex gap-stack rounded-md border border-dashed transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        empty ? "flex-col items-center p-card text-center" : "flex-col p-2 sm:flex-row sm:items-center",
        locked ? "cursor-not-allowed border-border-subtle bg-surface-sunken" : "cursor-pointer",
        !locked && (drop.isDragging ? "border-ink bg-surface-hover" : "border-border-strong bg-transparent hover:bg-surface-hover"),
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_INPUT_ACCEPT}
        disabled={locked}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        // Bấm input không được nổi bọt lên vùng, nếu không hộp chọn file mở lại lần nữa.
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ""
        }}
      />
      <Button ref={buttonRef} type="button" variant="secondary" disabled={locked} className="shrink-0">
        <ImagePlus />
        Tải ảnh lên
      </Button>
      <div className="min-w-0">
        <p role={locked ? "status" : undefined} className={cn("text-body-sm", locked ? "text-ink-muted" : "text-ink")}>
          {prompt}
        </p>
        <p className="text-caption text-ink-muted">
          {count}/{MAX_PRODUCT_IMAGES} ảnh · {ACCEPTED_IMAGE_LABEL}, tối đa {IMAGE_UPLOAD_RULES.products.maxLabel} mỗi ảnh.
          Ảnh đầu là ảnh đại diện.
        </p>
      </div>
    </div>
  )
}

export { ProductImageDropzone }
