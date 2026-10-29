/**
 * Toán thu phóng và kéo ảnh, thuần túy (không đụng DOM) để hook `use-pan-zoom` gọn và dễ kiểm chứng.
 *
 * Quy ước tọa độ: ảnh được căn giữa khung, `transform-origin` ở tâm ảnh; `x`, `y` là độ dời của ảnh so với
 * vị trí căn giữa (px), `scale` nhân lên kích thước "vừa khung". Điểm neo (`anchor`) cũng tính từ tâm khung.
 */

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface View {
  scale: number
  x: number
  y: number
}

/** Vùng đặt ảnh trong khung. `centerX`/`centerY` là tâm theo tọa độ màn hình, để đổi vị trí con trỏ thành điểm neo. */
export interface Stage extends Size {
  centerX: number
  centerY: number
}

/** Cách tính view mới từ view hiện tại (đã được kéo về trong giới hạn). */
export type ViewCompute = (base: View, content: Size, stage: Stage) => View

/** Áp một phép tính view. `smooth` bật hiệu ứng chuyển động (nút, bấm đúp) và tắt khi kéo/lăn để không bị trễ tay. */
export type ViewUpdater = (compute: ViewCompute, smooth: boolean) => void

/** 100% = vừa khung nhìn. Không thu nhỏ hơn mức vừa khung. */
export const MIN_SCALE = 1
export const MAX_SCALE = 4
/** Mỗi lần bấm + hoặc −. */
export const ZOOM_STEP = 0.5
/** "Vừa khung" giãn ảnh nhỏ tối đa bấy nhiêu lần kích thước gốc, để ảnh bé không bị nhòe quá. */
export const MAX_UPSCALE = 2
/** Lăn bánh xe về gần mức vừa khung thì hít về đúng mức đó (và căn giữa lại). */
const SNAP_RANGE = 0.02

export const RESET_VIEW: View = { scale: MIN_SCALE, x: 0, y: 0 }

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Kích thước ảnh khi "vừa khung": co/giãn đều để lọt khung, giãn tối đa `MAX_UPSCALE` lần kích thước gốc. */
export function fitSize(natural: Size, stage: Size): Size {
  if (natural.width <= 0 || natural.height <= 0 || stage.width <= 0 || stage.height <= 0) {
    return { width: 0, height: 0 }
  }
  const ratio = Math.min(stage.width / natural.width, stage.height / natural.height, MAX_UPSCALE)
  return { width: natural.width * ratio, height: natural.height * ratio }
}

/**
 * Giữ ảnh không bị kéo ra khỏi khung: ảnh (đã nhân `scale`) lớn hơn khung thì chỉ được lệch tối đa phần
 * dư chia đôi mỗi phía (luôn phủ kín khung); nhỏ hơn khung thì căn giữa.
 */
export function clampPan(view: View, content: Size, stage: Size): View {
  const limitX = Math.max(0, (content.width * view.scale - stage.width) / 2)
  const limitY = Math.max(0, (content.height * view.scale - stage.height) / 2)
  return {
    scale: view.scale,
    x: clamp(view.x, -limitX, limitX),
    y: clamp(view.y, -limitY, limitY),
  }
}

/** Đổi mức zoom nhưng giữ điểm `anchor` đứng yên trên màn hình (zoom quanh con trỏ hoặc tâm hai ngón). */
export function zoomAt(
  view: View,
  nextScale: number,
  anchor: Point,
  content: Size,
  stage: Size,
): View {
  let scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
  if (scale - MIN_SCALE < SNAP_RANGE) scale = MIN_SCALE
  const ratio = scale / view.scale
  return clampPan(
    {
      scale,
      x: anchor.x - (anchor.x - view.x) * ratio,
      y: anchor.y - (anchor.y - view.y) * ratio,
    },
    content,
    stage,
  )
}

/** Hệ số nhân mức zoom cho một sự kiện bánh xe. Ctrl+lăn (cũng là cử chỉ chụm trên bàn di chuột) nhạy hơn. */
export function wheelFactor(event: { deltaY: number; deltaMode: number; ctrlKey: boolean }): number {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
  return Math.exp(-event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.002))
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
