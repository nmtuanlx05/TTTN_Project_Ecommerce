import { useEffect, useState } from "react"

/**
 * Số mili giây còn lại tới `expiresAt` (`null` khi không có hạn). Mỗi nhịp tính lại từ đồng hồ (không trừ dần) nên tab bị trình duyệt
 * làm chậm vẫn đúng, và nhảy đúng khi quay lại tab. Chỉ chạy khi `active`; dừng ở 0; dọn timer và listener khi rời trang.
 * Đây chỉ là hiển thị: trạng thái hết hạn thật do backend trả.
 */
export function useCountdown(expiresAt: string | null, active: boolean): number | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active || !expiresAt) return
    const end = Date.parse(expiresAt)
    if (Number.isNaN(end)) return
    const tick = () => {
      const current = Date.now()
      setNow(current)
      if (current >= end) window.clearInterval(timer)
    }
    const timer = window.setInterval(tick, 1_000)
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now())
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [active, expiresAt])

  if (!expiresAt) return null
  const end = Date.parse(expiresAt)
  return Number.isNaN(end) ? null : Math.max(0, end - now)
}

/** `mm:ss` (phút có thể quá 59 nếu hạn dài). */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1_000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
