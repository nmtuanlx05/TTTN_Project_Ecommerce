import { useEffect } from "react"
import { STORE } from "@/lib/store-info"

/**
 * Đặt tiêu đề tab: "<title> — MONO STUDIO" (hoặc chỉ tên cửa hàng khi `title` bằng tên cửa hàng).
 * Rời trang thì trả lại tiêu đề trước đó, nên trang không gọi hook (admin, auth) không bị kẹt tiêu đề cũ.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title === STORE.name ? title : `${title} — ${STORE.name}`
    return () => {
      document.title = previous
    }
  }, [title])
}
