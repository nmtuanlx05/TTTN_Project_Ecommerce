import { useCallback, useState } from "react"
import { useLocation } from "react-router-dom"

/**
 * Trạng thái mở/đóng cho ngăn kéo menu và khung tìm kiếm: tự đóng khi PATHNAME đổi. Query đổi (`?q=`,
 * `?category=`) KHÔNG tự đóng, vì khung tìm kiếm đóng khi gửi và liên kết trong ngăn kéo đóng bằng
 * `setOpen(false)` ở `onClick` (bấm cùng một đường dẫn thì pathname không đổi). Ngăn kéo BỘ LỌC không dùng hook này
 * vì nó phải ở lại khi query đổi.
 */
export function useOpenUntilNavigation() {
  const { pathname } = useLocation()
  const [openedAt, setOpenedAt] = useState<string | null>(null)

  // Đã rời trang nơi mở: xóa hẳn, nếu không quay lại đúng trang đó sẽ tự mở lại.
  if (openedAt !== null && openedAt !== pathname) setOpenedAt(null)

  const open = openedAt === pathname
  const setOpen = useCallback((next: boolean) => setOpenedAt(next ? pathname : null), [pathname])
  return [open, setOpen] as const
}
