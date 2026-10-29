import { useRef, useState, type DragEvent } from "react"

/** Chỉ phản ứng khi thứ đang kéo là file (không phải chữ hay liên kết bị kéo vào). */
function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files")
}

/**
 * Kéo-thả file vào một vùng bằng sự kiện của trình duyệt. Rải `dropProps` lên phần tử của vùng.
 *
 * - `isDragging` bật khi có file đang kéo qua vùng. Sự kiện enter/leave bắn cả khi đi qua phần tử con,
 *   nên đếm số lần vào/ra thay vì tin một sự kiện leave đơn lẻ.
 * - Luôn `preventDefault` khi thả file, kể cả lúc `disabled`: nếu không, trình duyệt sẽ rời trang để mở file.
 * - `disabled` thì không gọi `onFiles` và con trỏ báo "không được thả".
 */
export function useFileDrop({
  disabled,
  onFiles,
}: {
  disabled: boolean
  onFiles: (files: File[]) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const depth = useRef(0)

  function reset() {
    depth.current = 0
    setIsDragging(false)
  }

  const dropProps = {
    onDragEnter: (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth.current += 1
      if (!disabled) setIsDragging(true)
    },
    onDragOver: (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = disabled ? "none" : "copy"
    },
    onDragLeave: (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setIsDragging(false)
    },
    onDrop: (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      reset()
      if (!disabled) onFiles(Array.from(event.dataTransfer.files))
    },
  }

  return { isDragging: isDragging && !disabled, dropProps }
}
