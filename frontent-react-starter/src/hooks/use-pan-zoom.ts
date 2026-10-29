import { useCallback, useEffect, useState, type KeyboardEvent } from "react"
import {
  MAX_SCALE,
  MIN_SCALE,
  RESET_VIEW,
  ZOOM_STEP,
  clampPan,
  fitSize,
  wheelFactor,
  zoomAt,
  type Point,
  type Size,
  type Stage,
  type View,
  type ViewCompute,
} from "@/lib/pan-zoom"

/** Mỗi lần bấm phím mũi tên dời ảnh bấy nhiêu phần kích thước khung. */
const KEY_PAN_FRACTION = 0.1
const ORIGIN: Point = { x: 0, y: 0 }

/** Vùng đặt ảnh = khung trừ padding (chừa chỗ cho nút điều khiển). */
function measureStage(element: HTMLElement): Stage {
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  const left = parseFloat(style.paddingLeft) || 0
  const right = parseFloat(style.paddingRight) || 0
  const top = parseFloat(style.paddingTop) || 0
  const bottom = parseFloat(style.paddingBottom) || 0
  const width = element.clientWidth - left - right
  const height = element.clientHeight - top - bottom
  return { width, height, centerX: rect.left + left + width / 2, centerY: rect.top + top + height / 2 }
}

/**
 * Thu phóng và kéo ảnh trong một khung (lightbox). Mọi thao tác chỉ đổi `transform` (translate + scale),
 * không tính lại bố cục. Bánh xe zoom quanh con trỏ: gắn `wheel` gốc dạng không-passive để chặn được
 * cuộn trang và zoom của trình duyệt (Ctrl+lăn). Cử chỉ con trỏ (kéo, chụm, bấm đúp) ở `use-pan-zoom-gestures`,
 * dùng chung `update` trả về từ đây. Tách thành hai hook vì cử chỉ giữ ref trong handler: trả chung một object
 * với các giá trị render thì lint của React Compiler coi mọi giá trị đều đọc ref lúc render.
 *
 * Hook được dùng trong phần nội dung của dialog nên mỗi lần mở là một trạng thái mới.
 */
export function usePanZoom({
  stageEl,
  naturalSize,
}: {
  /** Khung chứa ảnh (nhận sự kiện bánh xe, đo kích thước). Nơi gọi giữ trong state và gắn bằng `ref={setStageEl}`. */
  stageEl: HTMLElement | null
  /** Kích thước gốc của ảnh; `null` khi ảnh chưa tải xong (chưa thao tác được). */
  naturalSize: Size | null
}) {
  const [stageSize, setStageSize] = useState<Size>({ width: 0, height: 0 })
  const [motion, setMotion] = useState<View & { smooth: boolean }>({ ...RESET_VIEW, smooth: true })

  // Theo dõi kích thước khung (xoay màn hình, đổi cỡ cửa sổ). ResizeObserver bắn ngay lần đầu quan sát.
  useEffect(() => {
    if (!stageEl) return
    const observer = new ResizeObserver(() => {
      const { width, height } = measureStage(stageEl)
      setStageSize({ width, height })
    })
    observer.observe(stageEl)
    return () => observer.disconnect()
  }, [stageEl])

  const fit = naturalSize ? fitSize(naturalSize, stageSize) : { width: 0, height: 0 }
  // Dẫn xuất lúc render nên đổi cỡ cửa sổ tự kéo ảnh về trong giới hạn mà không cần effect.
  const view = clampPan(motion, fit, stageSize)

  /** Mọi thay đổi đi qua đây: đo khung ngay lúc có sự kiện, rồi tính view mới từ view hiện tại. */
  const update = useCallback(
    (compute: ViewCompute, smooth: boolean) => {
      if (!stageEl || !naturalSize) return
      const stage = measureStage(stageEl)
      const content = fitSize(naturalSize, stage)
      setMotion((previous) => ({
        ...compute(clampPan(previous, content, stage), content, stage),
        smooth,
      }))
    },
    [stageEl, naturalSize],
  )

  const zoomBy = (delta: number) =>
    update((base, content, stage) => zoomAt(base, base.scale + delta, ORIGIN, content, stage), true)
  const reset = () => update(() => RESET_VIEW, true)

  useEffect(() => {
    if (!stageEl) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = wheelFactor(event)
      const { clientX, clientY } = event
      update((base, content, stage) => {
        const anchor = { x: clientX - stage.centerX, y: clientY - stage.centerY }
        return zoomAt(base, base.scale * factor, anchor, content, stage)
      }, false)
    }
    stageEl.addEventListener("wheel", onWheel, { passive: false })
    return () => stageEl.removeEventListener("wheel", onWheel)
  }, [stageEl, update])

  /** + − 0 thu phóng; mũi tên dời ảnh khi đã phóng to (cho người chỉ dùng bàn phím). Bỏ qua khi giữ Ctrl/Cmd/Alt. */
  function handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const direction = {
      ArrowLeft: { x: 1, y: 0 },
      ArrowRight: { x: -1, y: 0 },
      ArrowUp: { x: 0, y: 1 },
      ArrowDown: { x: 0, y: -1 },
    }[event.key]

    if (event.key === "+" || event.key === "=") {
      event.preventDefault()
      zoomBy(ZOOM_STEP)
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault()
      zoomBy(-ZOOM_STEP)
    } else if (event.key === "0") {
      event.preventDefault()
      reset()
    } else if (direction && view.scale > MIN_SCALE) {
      event.preventDefault()
      update(
        (base, content, stage) =>
          clampPan(
            {
              ...base,
              x: base.x + direction.x * stage.width * KEY_PAN_FRACTION,
              y: base.y + direction.y * stage.height * KEY_PAN_FRACTION,
            },
            content,
            stage,
          ),
        true,
      )
    }
  }

  return {
    update,
    handleKeyDown,
    /** Kích thước ảnh khi vừa khung (đặt làm width/height của ảnh); transform áp lên trên đó. */
    fitSize: fit,
    view,
    smooth: motion.smooth,
    percent: Math.round(view.scale * 100),
    isDefaultView: view.scale <= MIN_SCALE && view.x === 0 && view.y === 0,
    canZoomIn: view.scale < MAX_SCALE,
    canZoomOut: view.scale > MIN_SCALE,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(-ZOOM_STEP),
    reset,
  }
}
