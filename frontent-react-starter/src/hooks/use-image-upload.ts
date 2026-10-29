import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-error"
import { MSG_ONE_IMAGE_ONLY, validateImageFile } from "@/lib/image-rules"
import { uploadImage } from "@/lib/upload-image"
import type { ImageUploadKind } from "@/types/upload"

/**
 * Luồng chọn và upload một ảnh: kiểm tra phía client (nhiều file, loại, dung lượng), gửi lên server kèm
 * tiến độ, cho hủy giữa chừng. Server từ chối hoặc lỗi mạng thì chỉ đặt `error`; giá trị ảnh hiện tại
 * do nơi gọi giữ, hook không đụng tới.
 *
 * - `previewUrl`: ảnh vừa chọn dưới dạng object URL để xem trước trong lúc tải. Được thu hồi khi xong,
 *   khi chọn file khác và khi component bị gỡ.
 * - Đang tải thì `selectFiles` không làm gì (chặn chọn thêm).
 * - Bị gỡ giữa chừng thì request bị hủy.
 */
export function useImageUpload({
  kind,
  onUploaded,
}: {
  kind: ImageUploadKind
  /** Gọi với URL ảnh sau khi server lưu xong. */
  onUploaded: (url: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [succeeded, setSucceeded] = useState(false)
  const controller = useRef<AbortController | null>(null)

  const mutation = useMutation<string, ApiError, { file: File; signal: AbortSignal }>({
    mutationFn: ({ file, signal }) => uploadImage(kind, file, { signal, onProgress: setProgress }),
  })

  // Thu hồi object URL cũ mỗi khi đổi sang URL khác hoặc component bị gỡ.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  // Gỡ component khi đang tải thì hủy request, không để nó chạy tiếp vô chủ.
  useEffect(() => {
    return () => controller.current?.abort()
  }, [])

  function selectFiles(files: File[]) {
    if (mutation.isPending || files.length === 0) return
    setError(null)
    setSucceeded(false)

    if (files.length > 1) {
      setError(MSG_ONE_IMAGE_ONLY)
      return
    }
    const [file] = files
    const problem = validateImageFile(file, kind)
    if (problem) {
      setError(problem)
      return
    }

    const abort = new AbortController()
    controller.current = abort
    setProgress(null)
    setPreviewUrl(URL.createObjectURL(file))

    mutation.mutate(
      { file, signal: abort.signal },
      {
        onSuccess: (url) => {
          setSucceeded(true)
          onUploaded(url)
        },
        // Người dùng bấm Hủy: không phải lỗi, không báo gì.
        onError: (apiError) => {
          if (!abort.signal.aborted) setError(apiError.message)
        },
        onSettled: () => {
          controller.current = null
          setPreviewUrl(null)
          setProgress(null)
        },
      },
    )
  }

  return {
    isUploading: mutation.isPending,
    progress,
    previewUrl,
    error,
    succeeded,
    selectFiles,
    cancel: () => controller.current?.abort(),
  }
}
