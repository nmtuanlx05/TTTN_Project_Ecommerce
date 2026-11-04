import { MAX_COLOR_DOTS } from "../constants"
import type { CatalogColor } from "../types"

/**
 * Chấm màu bên phải giá của thẻ sản phẩm: chấm tròn 14px, tối đa `MAX_COLOR_DOTS` chấm rồi "+N" (N = số màu còn lại). Màu chưa có mã hex bị bỏ qua.
 * MỌI chấm có viền rất mảnh, nhạt (`ink/15`) để màu trắng/ngà vẫn thấy trên nền be, không phân biệt sáng tối. Chỉ trang trí (không bấm được);
 * tên các màu có trong chữ `sr-only`. Co lại thay vì đẩy giá: giá `shrink-0` ở nơi dùng, chấm tự xuống dòng khi thẻ quá hẹp.
 */
function ProductCardColors({ colors }: { colors: CatalogColor[] }) {
  const shown = colors.filter((color): color is CatalogColor & { hex: string } => color.hex !== null)
  if (shown.length === 0) return null
  const dots = shown.slice(0, MAX_COLOR_DOTS)
  const rest = shown.length - dots.length

  return (
    <>
      <span className="sr-only">Màu: {shown.map((color) => color.name).join(", ")}</span>
      <span aria-hidden="true" className="flex min-w-0 flex-wrap items-center justify-end gap-x-1 gap-y-0.5">
        {dots.map((color) => (
          <span
            key={color.name}
            style={{ backgroundColor: color.hex }}
            className="size-3.5 rounded-4xl border border-ink/15"
          />
        ))}
        {rest > 0 ? <span className="text-caption text-ink-muted">+{rest}</span> : null}
      </span>
    </>
  )
}

export { ProductCardColors }
