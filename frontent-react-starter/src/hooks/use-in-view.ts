import { useEffect, useState } from "react"

interface InViewState {
  /** Đang nằm trong khung nhìn. */
  inView: boolean
  /** Đã cuộn qua và nằm phía TRÊN khung nhìn (không phải còn ở phía dưới chưa tới). */
  above: boolean
}

/**
 * Theo dõi một phần tử bằng IntersectionObserver (không cần scroll listener). `once`: thấy một lần là
 * ngừng quan sát và `inView` giữ nguyên `true`. Gắn `ref` vào phần tử cần theo dõi.
 * `initialInView`: giá trị trước lần quan sát đầu (mặc định `false`; header đặt `true` để khỏi nháy trạng thái "đã cuộn").
 * Môi trường không có IntersectionObserver coi như đang thấy, để không giấu nội dung vĩnh viễn.
 */
export function useInView<T extends Element = HTMLElement>({
  once = false,
  rootMargin = "0px",
  initialInView = typeof IntersectionObserver === "undefined",
}: { once?: boolean; rootMargin?: string; initialInView?: boolean } = {}) {
  const [node, setNode] = useState<T | null>(null)
  const [state, setState] = useState<InViewState>(() => ({ inView: initialInView, above: false }))

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting
        const rootTop = entry.rootBounds?.top ?? 0
        setState({ inView, above: !inView && entry.boundingClientRect.top < rootTop })
        if (inView && once) observer.disconnect()
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, once, rootMargin])

  return { ref: setNode, ...state }
}
