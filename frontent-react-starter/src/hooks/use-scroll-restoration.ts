import { useEffect, useLayoutEffect, useRef } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

/**
 * Cuộn của storefront. `BrowserRouter` không có `<ScrollRestoration>` (chỉ có ở data router) và trình duyệt tự khôi phục
 * thì sai chỗ vì nội dung vẽ sau popstate, nên làm tay:
 * - Nhớ vị trí cuộn theo `location.key` (sessionStorage, nên cả F5 cũng khôi phục được).
 * - Back/Forward (POP): khôi phục vị trí đã nhớ, chờ tới khi trang đủ cao (dữ liệu từ cache thì tức thì, tải mới thì
 *   chờ tối đa ~1 giây); người dùng cuộn tay thì hủy khôi phục.
 * - Điều hướng mới (PUSH/REPLACE) đổi PATHNAME thì cuộn lên đầu. Chỉ đổi query (lọc, đổi trang) thì KHÔNG: các trang
 *   đó tự cuộn khi cần (đổi trang cuộn tới đầu danh sách).
 */

const STORAGE_PREFIX = "scroll:"
const MAX_WAIT_FRAMES = 60

function readSaved(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    const value = raw === null ? NaN : Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function save(key: string, value: number) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, String(Math.round(value)))
  } catch {
    // sessionStorage bị chặn: bỏ qua, không khôi phục được cuộn
  }
}

/** Cuộn tới `top`, đợi trang đủ cao rồi mới cuộn; trả về hàm hủy. */
function restoreWhenTallEnough(top: number): () => void {
  let frame = 0
  let handle = 0
  const cancel = () => {
    cancelAnimationFrame(handle)
    window.removeEventListener("wheel", cancel)
    window.removeEventListener("touchstart", cancel)
    window.removeEventListener("keydown", cancel)
  }
  const tick = () => {
    const reachable = document.documentElement.scrollHeight - window.innerHeight >= top
    if (reachable || frame >= MAX_WAIT_FRAMES) {
      window.scrollTo({ top, left: 0, behavior: "instant" })
      cancel()
      return
    }
    frame += 1
    handle = requestAnimationFrame(tick)
  }
  window.addEventListener("wheel", cancel, { passive: true })
  window.addEventListener("touchstart", cancel, { passive: true })
  window.addEventListener("keydown", cancel)
  tick()
  return cancel
}

export function useScrollRestoration() {
  const { key, pathname } = useLocation()
  const navigationType = useNavigationType()
  // Khóa của trang đang hiển thị: cập nhật ĐỒNG BỘ trong layout effect lúc đổi trang, nên sự kiện cuộn sinh ra bởi việc
  // nội dung bị thay (trình duyệt kẹp lại vị trí) luôn ghi vào khóa mới, không làm hỏng vị trí đã nhớ của trang cũ.
  const currentKey = useRef(key)
  const previousPath = useRef(pathname)

  // Tự quản lý cuộn nên tắt khôi phục mặc định của trình duyệt khi còn ở storefront. Nhớ vị trí (chống dồn bằng rAF).
  useEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = "manual"
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => save(currentKey.current, window.scrollY))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      history.scrollRestoration = previous
    }
  }, [])

  // Đổi trang: khôi phục (POP, kể cả lần nạp đầu/F5) hoặc cuộn lên đầu khi PUSH/REPLACE sang pathname khác.
  useLayoutEffect(() => {
    currentKey.current = key
    const pathChanged = previousPath.current !== pathname
    previousPath.current = pathname

    if (navigationType === "POP") {
      const saved = readSaved(key)
      return saved === null ? undefined : restoreWhenTallEnough(saved)
    }
    if (pathChanged) window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [key, pathname, navigationType])
}
