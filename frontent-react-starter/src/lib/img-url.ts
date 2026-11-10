/**
 * Dựng URL ảnh hiển thị từ URL gốc (docs/api/uploads.md, mục "Hiển thị ảnh"). Backend luôn trả URL gốc; frontend tự chèn biến đổi của Cloudinary.
 *
 * - CHỈ biến đổi URL dạng `https://res.cloudinary.com/<cloud>/image/upload/v<số>/…` (đúng dạng backend trả). Mọi URL khác (picsum, `/uploads/...`,
 *   `http://localhost/...`, blob, chuỗi lạ) và URL đã có đoạn biến đổi (không có `v<số>/` ngay sau `upload/`) được TRẢ NGUYÊN.
 * - Chỉ dùng các mức rộng cố định `IMG_WIDTHS`; không dùng `dpr_auto`. Mỗi tổ hợp (ảnh, rộng, định dạng) là một lượt biến đổi tính vào hạn mức
 *   gói Cloudinary, nên ít mức cố định thì số biến thể bị chặn trên và CDN dùng lại được cache.
 */

/** Các mức chiều rộng (px) được phép. Đổi ở đây phải đổi cả docs/api/uploads.md của backend. */
export const IMG_WIDTHS = [160, 320, 640, 960, 1280] as const
export type ImgWidth = (typeof IMG_WIDTHS)[number]

const MAX_WIDTH: ImgWidth = IMG_WIDTHS[IMG_WIDTHS.length - 1]

/** Nhóm 1: phần đầu đến hết `/image/upload/`; nhóm 2: phần còn lại. */
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/?#]+\/image\/upload\/)(v\d+\/.+)$/

/**
 * Làm tròn LÊN mức rộng gần nhất: ≤160 → 160, 161..320 → 320, …, >1280 → 1280. Giá trị không hữu hạn (NaN) coi như mức lớn nhất
 * để ảnh không bị mờ; số âm hoặc 0 → mức nhỏ nhất.
 */
export function snapImgWidth(width: number): ImgWidth {
  if (Number.isNaN(width)) return MAX_WIDTH
  return IMG_WIDTHS.find((step) => step >= width) ?? MAX_WIDTH
}

/** `url` có phải URL Cloudinary mà `imgUrl` sẽ biến đổi không. */
export function isTransformableImg(url: string): boolean {
  return CLOUDINARY_UPLOAD.test(url)
}

/** URL hiển thị ở mức rộng `width` (đã làm tròn lên). URL không phải Cloudinary hoặc đã có biến đổi thì trả nguyên. */
export function imgUrl(url: string, width: number): string {
  const match = CLOUDINARY_UPLOAD.exec(url)
  if (!match) return url
  return `${match[1]}f_auto,q_auto,c_limit,w_${snapImgWidth(width)}/${match[2]}`
}

/**
 * Giá trị `srcset` cho các mức rộng `widths` (mỗi mức làm tròn lên, bỏ trùng, tăng dần), vd. `…w_320… 320w, …w_640… 640w`.
 * `undefined` khi URL không biến đổi được hoặc chỉ có một mức (không cần `srcset`).
 */
export function imgSrcSet(url: string, widths: readonly number[] = IMG_WIDTHS): string | undefined {
  if (!isTransformableImg(url)) return undefined
  const steps = [...new Set(widths.map(snapImgWidth))].sort((a, b) => a - b)
  if (steps.length < 2) return undefined
  return steps.map((step) => `${imgUrl(url, step)} ${step}w`).join(", ")
}

/** Cách hiển thị một ảnh theo ngữ cảnh: mức rộng của `src` dự phòng, các mức của `srcset` và thuộc tính `sizes`. */
export interface ImgPreset {
  src: ImgWidth
  widths: readonly ImgWidth[]
  sizes: string
}

/**
 * Các preset dùng chung (đã đối chiếu với lưới thật; xem docs/storefront-design.md, mục "Ảnh").
 * - `tiny`: ảnh rất nhỏ, khung ≤ 64px (thumbnail đơn hàng, avatar nhỏ). Một mức 160.
 * - `thumb`: khung cố định ≤ 128px (giỏ hàng, tóm tắt thanh toán, bảng admin, ô chọn ảnh). 160/320.
 * - `gallery-thumb`: hàng ảnh nhỏ dưới ảnh chính (4 cột). 160/320.
 * - `card`: thẻ sản phẩm trong lưới 2/3/4 cột. 320/640.
 * - `detail`: ảnh chính trang chi tiết (7/12 cột từ `lg`, nửa chiều rộng từ `md`). 640/960/1280.
 * - `lightbox`: xem ảnh lớn, một mức 1280 (không dùng ảnh gốc để giữ hạn mức và dung lượng).
 */
export const IMG_PRESETS = {
  tiny: { src: 160, widths: [160], sizes: "64px" },
  thumb: { src: 160, widths: [160, 320], sizes: "128px" },
  "gallery-thumb": {
    src: 160,
    widths: [160, 320],
    sizes: "(min-width: 1280px) 160px, (min-width: 1024px) 14vw, (min-width: 768px) 12vw, 22vw",
  },
  card: {
    src: 320,
    widths: [320, 640],
    sizes: "(min-width: 1280px) 290px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw",
  },
  detail: {
    src: 960,
    widths: [640, 960, 1280],
    sizes: "(min-width: 1280px) 680px, (min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw",
  },
  lightbox: { src: 1280, widths: [1280], sizes: "100vw" },
} as const satisfies Record<string, ImgPreset>

export type ImgPresetName = keyof typeof IMG_PRESETS

/** Thuộc tính `src`/`srcSet`/`sizes` cho `<img>` theo preset. `srcSet` và `sizes` chỉ có khi URL biến đổi được và preset có từ hai mức. */
export function imgAttrs(
  url: string,
  preset: ImgPresetName,
): { src: string; srcSet?: string; sizes?: string } {
  const { src, widths, sizes } = IMG_PRESETS[preset]
  const srcSet = imgSrcSet(url, widths)
  return srcSet ? { src: imgUrl(url, src), srcSet, sizes } : { src: imgUrl(url, src) }
}
