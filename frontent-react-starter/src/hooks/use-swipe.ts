import { useRef, type PointerEvent } from "react"

/** Quãng vuốt ngang tối thiểu (px) để tính là một cú vuốt, và độ nghiêng cho phép (ngang phải trội hơn dọc) để không nhầm với cuộn trang. */
const SWIPE_MIN_DISTANCE = 48
const SWIPE_DOMINANCE = 1.5

/**
 * Vuốt ngang bằng cảm ứng. Chỉ nhận `pointerType === "touch"` (chuột không "kéo để chuyển slide"). Gắn kèm `touch-action: pan-y` lên phần tử
 * để cuộn dọc vẫn chạy; khi trình duyệt tiếp quản cuộn dọc thì `pointercancel` hủy cú vuốt.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight }: { onSwipeLeft: () => void; onSwipeRight: () => void }) {
  const start = useRef<{ x: number; y: number } | null>(null)

  return {
    onPointerDown: (event: PointerEvent) => {
      start.current = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null
    },
    onPointerUp: (event: PointerEvent) => {
      const origin = start.current
      start.current = null
      if (!origin) return
      const dx = event.clientX - origin.x
      const dy = event.clientY - origin.y
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return
      if (dx < 0) onSwipeLeft()
      else onSwipeRight()
    },
    onPointerCancel: () => {
      start.current = null
    },
  }
}
