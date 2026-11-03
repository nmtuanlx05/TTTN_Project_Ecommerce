import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { useLocation } from "react-router-dom"

const OPEN_DELAY_MS = 100
const CLOSE_DELAY_MS = 150

/**
 * Trạng thái của menu bảng toàn chiều rộng ở header: đang mở bảng của mục nào (`openKey`, hoặc `null`) cùng hai hẹn giờ.
 *
 * - `openSoon` mở sau 100ms, `closeSoon` đóng sau 150ms (hai hẹn giờ tách nhau để rời một mục không hủy lệnh đóng đang chờ).
 *   `openNow` / `closeNow` dùng cho bàn phím và cảm ứng, không trễ.
 * - Tự đóng khi vị trí đổi (`location.key`: đổi đường dẫn LẪN đổi `?category=`, kể cả Back/Forward) và khi bấm/chạm ra ngoài `containerRef`.
 *   Esc và trả focus do thành phần gọi xử lý vì phải biết focus đang ở đâu.
 */
export function useMegaMenu(containerRef: RefObject<HTMLElement | null>) {
  const { key: locationKey } = useLocation()
  const [opened, setOpened] = useState<{ key: string; at: string } | null>(null)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)

  // Đã sang vị trí khác: xóa hẳn, nếu không quay lại đúng vị trí cũ sẽ tự mở lại.
  if (opened !== null && opened.at !== locationKey) setOpened(null)
  const openKey = opened?.key ?? null

  const cancelOpen = useCallback(() => window.clearTimeout(openTimer.current), [])
  const cancelClose = useCallback(() => window.clearTimeout(closeTimer.current), [])

  const openNow = useCallback(
    (key: string) => {
      cancelOpen()
      cancelClose()
      setOpened({ key, at: locationKey })
    },
    [cancelOpen, cancelClose, locationKey],
  )

  const closeNow = useCallback(() => {
    cancelOpen()
    cancelClose()
    setOpened(null)
  }, [cancelOpen, cancelClose])

  const openSoon = useCallback(
    (key: string) => {
      cancelClose()
      cancelOpen()
      openTimer.current = window.setTimeout(() => openNow(key), OPEN_DELAY_MS)
    },
    [cancelClose, cancelOpen, openNow],
  )

  const closeSoon = useCallback(() => {
    cancelOpen()
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpened(null), CLOSE_DELAY_MS)
  }, [cancelOpen, cancelClose])

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    },
    [],
  )

  // Bấm hoặc chạm ra ngoài thì đóng (kể cả bấm nút tìm kiếm cạnh đó).
  useEffect(() => {
    if (openKey === null) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpened(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [openKey, containerRef])

  return { openKey, openNow, openSoon, closeNow, closeSoon, cancelOpen, cancelClose }
}
