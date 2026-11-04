import { useState } from "react"

/**
 * Trạng thái tải của MỘT ảnh: đã xong, hay lỗi. Nhớ đúng URL đã xong/lỗi (không phải cờ chung) nên đổi URL là tải lại ngay.
 * `usable`: false thì coi như không có ảnh (URL không hợp lệ) và không dựng `<img>`.
 * Dùng chung cho ảnh sản phẩm và ảnh tĩnh của trang chủ: gắn `imgProps` lên `<img>`, `showImage` quyết định dựng ảnh hay khung dự phòng.
 */
export function useImageLoad({
  src,
  usable = true,
  onLoaded,
  onFailed,
}: {
  src: string | null
  usable?: boolean
  onLoaded?: () => void
  onFailed?: () => void
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src !== null && usable && failedSrc !== src
  const loaded = showImage && loadedSrc === src

  const imgProps = {
    // Ảnh có sẵn trong cache có thể đã xong trước khi gắn onLoad.
    ref: (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        setLoadedSrc(src)
        onLoaded?.()
      }
    },
    onLoad: () => {
      setLoadedSrc(src)
      onLoaded?.()
    },
    onError: () => {
      setFailedSrc(src)
      onFailed?.()
    },
  }

  return { showImage, loaded, imgProps }
}
