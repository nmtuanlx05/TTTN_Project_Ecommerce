import type { CatalogVariant } from "./types"

/** Logic chọn màu/size thuần túy (không React), để dễ kiểm tra. */

export type Axis = "color" | "size"
export interface VariantChoice {
  color: string
  size: string
}
/** `available` còn hàng; `soldout` có tổ hợp nhưng hết hàng; `missing` không có tổ hợp này. */
export type OptionState = "available" | "soldout" | "missing"

const otherAxis = (axis: Axis): Axis => (axis === "color" ? "size" : "color")

export function findVariant(variants: CatalogVariant[], choice: VariantChoice) {
  return variants.find((variant) => variant.color === choice.color && variant.size === choice.size)
}

/** Các giá trị của một trục theo thứ tự xuất hiện đầu tiên (thứ tự `id` của backend). */
export function optionValues(variants: CatalogVariant[], axis: Axis): string[] {
  return [...new Set(variants.map((variant) => variant[axis]))]
}

/** Mặc định: biến thể còn hàng đầu tiên; không có thì biến thể đầu tiên (nút mua sẽ khóa). */
export function defaultChoice(variants: CatalogVariant[]): VariantChoice | null {
  const first = variants.find((variant) => variant.inStock) ?? variants[0]
  return first ? { color: first.color, size: first.size } : null
}

/**
 * Trạng thái một chip khi giữ nguyên giá trị đang chọn ở trục còn lại. Chip `missing` bị vô hiệu hóa,
 * TRỪ khi không có đường đi tới nó bằng hai lần bấm (đổi trục kia sang một giá trị đang bấm được rồi mới
 * chọn nó): lúc đó vẫn cho bấm để không kẹt với ma trận thưa (xem `selectOption`, nhảy sang biến thể gần nhất).
 */
export function describeOption(
  variants: CatalogVariant[],
  choice: VariantChoice,
  axis: Axis,
  value: string,
): { state: OptionState; disabled: boolean } {
  const other = otherAxis(axis)
  const variant = findVariant(variants, { ...choice, [axis]: value })
  if (variant)
    return {
      state: variant.inStock ? "available" : "soldout",
      disabled: false,
    }

  const reachable = optionValues(variants, other).some(
    (step) =>
      findVariant(variants, { ...choice, [axis]: value, [other]: step }) &&
      findVariant(variants, { ...choice, [other]: step }),
  )
  return { state: "missing", disabled: reachable }
}

/** Chọn một chip. Tổ hợp không tồn tại (chỉ khi chip được cho bấm để thoát kẹt) thì nhảy sang biến thể còn hàng đầu tiên của giá trị đó. */
export function selectOption(
  variants: CatalogVariant[],
  choice: VariantChoice,
  axis: Axis,
  value: string,
): VariantChoice {
  const next = { ...choice, [axis]: value }
  if (findVariant(variants, next)) return next
  const matches = variants.filter((variant) => variant[axis] === value)
  const target = matches.find((variant) => variant.inStock) ?? matches[0]
  return target ? { color: target.color, size: target.size } : choice
}

/** Mã màu `#RRGGBB` của một tên màu: lấy từ biến thể đầu tiên cùng màu có mã (backend đảm bảo cùng màu thì cùng mã); không có thì `undefined`. */
export function colorHexOf(variants: CatalogVariant[], color: string): string | undefined {
  return variants.find((variant) => variant.color === color && variant.colorHex)?.colorHex ?? undefined
}
