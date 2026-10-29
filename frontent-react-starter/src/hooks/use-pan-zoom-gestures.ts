import { useRef, type PointerEvent as ReactPointerEvent } from "react"
import {
  MIN_SCALE,
  RESET_VIEW,
  clampPan,
  distance,
  midpoint,
  zoomAt,
  type ViewUpdater,
} from "@/lib/pan-zoom"

/** Quãng xê dịch tối đa (px) vẫn coi là "bấm" chứ không phải kéo. */
const TAP_SLOP = 8
/** Hai lần bấm trong khoảng này (ms) và gần nhau (px) là bấm đúp. */
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_RANGE = 30
const DOUBLE_TAP_SCALE = 2

type StageEvent = ReactPointerEvent<HTMLDivElement>

/**
 * Cử chỉ con trỏ của lightbox, dùng pointer events để chuột, chạm và bút chạy chung một đường:
 * - kéo một con trỏ (khi đã phóng to) để di chuyển ảnh;
 * - hai ngón: chụm để zoom quanh tâm hai ngón, đồng thời kéo theo tâm;
 * - bấm đúp: về vừa khung, hoặc phóng 200% quanh điểm bấm. Tự nhận diện vì `dblclick` không đáng tin trên cảm ứng;
 * - bấm một lần ra ngoài ảnh gọi `onTapOutside` (ảnh là phần tử có thuộc tính `data-pan-zoom-content`). Cố ý không dùng `click`: sau khi kéo, trình duyệt vẫn bắn
 *   `click` lên phần tử đã capture nên dễ đóng nhầm.
 */
export function usePanZoomGestures({
  update,
  scale,
  onTapOutside,
}: {
  update: ViewUpdater
  /** Mức zoom hiện tại: chỉ kéo được khi lớn hơn mức vừa khung. */
  scale: number
  onTapOutside: () => void
}) {
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({
    travel: 0,
    multi: false,
    pinchDistance: 0,
    lastTap: null as { time: number; x: number; y: number } | null,
  })

  function onPointerDown(event: StageEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const state = gesture.current
    if (pointers.current.size === 1) {
      state.travel = 0
      state.multi = false
      return
    }
    state.multi = true
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      state.pinchDistance = distance(a, b)
    }
  }

  function onPointerMove(event: StageEvent) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const point = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, point)
    const state = gesture.current

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const other = a === point ? b : a
      const mid = midpoint(a, b)
      const previousMid = midpoint(previous, other)
      const nextDistance = distance(a, b)
      const factor = state.pinchDistance > 0 ? nextDistance / state.pinchDistance : 1
      state.pinchDistance = nextDistance
      update((base, content, stage) => {
        const anchor = { x: mid.x - stage.centerX, y: mid.y - stage.centerY }
        const zoomed = zoomAt(base, base.scale * factor, anchor, content, stage)
        return clampPan(
          { ...zoomed, x: zoomed.x + (mid.x - previousMid.x), y: zoomed.y + (mid.y - previousMid.y) },
          content,
          stage,
        )
      }, false)
      return
    }

    if (pointers.current.size !== 1 || state.multi) return
    const dx = point.x - previous.x
    const dy = point.y - previous.y
    state.travel += Math.abs(dx) + Math.abs(dy)
    if (scale <= MIN_SCALE) return
    // Capture khi đã thật sự kéo để không mất sự kiện lúc con trỏ ra khỏi khung.
    if (state.travel > TAP_SLOP && !event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    update((base, content, stage) => clampPan({ ...base, x: base.x + dx, y: base.y + dy }, content, stage), false)
  }

  /** `canTap` false với pointercancel (hệ thống hủy cử chỉ): không tính là bấm. */
  function endPointer(event: StageEvent, canTap: boolean) {
    const state = gesture.current
    const isTap =
      canTap &&
      pointers.current.size === 1 &&
      pointers.current.has(event.pointerId) &&
      !state.multi &&
      state.travel <= TAP_SLOP
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) state.multi = false
    if (!isTap) return

    const onContent = event.target instanceof Element && event.target.closest("[data-pan-zoom-content]")
    if (!onContent) {
      state.lastTap = null
      onTapOutside()
      return
    }

    const { clientX, clientY, timeStamp } = event
    const last = state.lastTap
    const isDoubleTap =
      last !== null &&
      timeStamp - last.time < DOUBLE_TAP_MS &&
      Math.hypot(clientX - last.x, clientY - last.y) < DOUBLE_TAP_RANGE
    if (!isDoubleTap) {
      state.lastTap = { time: timeStamp, x: clientX, y: clientY }
      return
    }
    state.lastTap = null
    update((base, content, stage) => {
      if (base.scale > MIN_SCALE) return RESET_VIEW
      const anchor = { x: clientX - stage.centerX, y: clientY - stage.centerY }
      return zoomAt(base, DOUBLE_TAP_SCALE, anchor, content, stage)
    }, true)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: StageEvent) => endPointer(event, true),
    onPointerCancel: (event: StageEvent) => endPointer(event, false),
  }
}
