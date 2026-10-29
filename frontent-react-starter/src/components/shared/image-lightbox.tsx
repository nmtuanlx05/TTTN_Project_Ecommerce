import type { DragEvent } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ImageLightboxViewer } from "./image-lightbox-viewer"

/**
 * Chặn kéo-thả file lan ra ngoài lightbox. Dialog render ở Portal nhưng về cây React vẫn nằm dưới nơi
 * mở nó; nếu lightbox mở từ khung upload thì file thả lên đây sẽ kích hoạt upload của khung đó.
 * `preventDefault` còn để trình duyệt không rời trang đi mở file.
 */
function stopDrag(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Xem ảnh lớn, có thu phóng và kéo. Điều khiển từ ngoài (`open`/`onOpenChange`) để dùng lại ở form,
 * bảng, ảnh đại diện, storefront.
 *
 * Dựng thẳng trên Base UI Dialog như `ConfirmDialog`/`FormDialog` vì `ui/dialog.tsx` (shadcn) trái token
 * của hệ thống. Dialog modal nên khóa cuộn trang, khóa focus bên trong, Esc đóng và trả focus về nút đã mở.
 *
 * Nền tối bằng lớp `dark` đặt lên Popup: token dark mode khai báo trong `.dark` và Tailwind dùng
 * `@theme inline`, nên mọi token (nền, chữ, nút, viền focus) trong Popup tự đổi sang bộ tối kể cả khi
 * giao diện đang sáng, không cần token riêng.
 */
function ImageLightbox({
  src,
  alt,
  open,
  onOpenChange,
  title,
}: {
  src: string
  alt: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tiêu đề cho trình đọc màn hình (ẩn). Mặc định "Xem ảnh lớn: {alt}". */
  title?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Popup
          onDragEnter={stopDrag}
          onDragOver={stopDrag}
          onDragLeave={stopDrag}
          onDrop={stopDrag}
          className="dark fixed inset-0 z-50 bg-surface-sunken/90 text-ink outline-none backdrop-blur-xs duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        >
          <Dialog.Title className="sr-only">{title ?? `Xem ảnh lớn: ${alt}`}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Phóng to bằng nút + và −, bánh xe chuột hoặc hai ngón tay. Khi đã phóng to, kéo để di chuyển
            ảnh. Nhấn Esc để đóng.
          </Dialog.Description>
          <ImageLightboxViewer src={src} alt={alt} onClose={() => onOpenChange(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { ImageLightbox }
