import { z } from "zod"

/**
 * So khóa không phân biệt hoa/thường và dấu như collation của DB ("Trắng" và "trang" là một),
 * để báo trùng ngay trong form thay vì chờ backend trả 400.
 */
export function foldKey(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ")
}

/** Chặn URL ảnh trùng (so khớp đúng chuỗi như backend); lỗi gắn vào `images`. */
export function checkDuplicateImages(value: { images: { url: string }[] }, ctx: z.RefinementCtx) {
  const seen = new Set<string>()
  for (const { url } of value.images) {
    const key = url.trim()
    if (key !== "" && seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["images"],
        message: "Có ảnh bị trùng đường dẫn. Mỗi ảnh chỉ thêm một lần.",
      })
      return
    }
    seen.add(key)
  }
}

/** Chặn trùng SKU, trùng cặp (size, màu) và cùng tên màu mà khác mã màu; lỗi gắn vào ô của hàng đứng sau. */
export function checkDuplicateVariants(
  value: {
    variants: { sku: string; size: string; color: string; colorHex: string }[]
  },
  ctx: z.RefinementCtx,
) {
  const hexByColor = new Map<string, { hex: string; row: number }>()
  const skuRows = new Map<string, number>()
  const pairRows = new Map<string, number>()
  value.variants.forEach((row, index) => {
    if (row.sku.trim() !== "") {
      const key = foldKey(row.sku)
      const first = skuRows.get(key)
      if (first === undefined) skuRows.set(key, index)
      else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "sku"],
          message: `SKU này đã dùng ở biến thể ${first + 1}. Mỗi SKU chỉ dùng một lần, hãy đổi SKU.`,
        })
      }
    }
    const hex = row.colorHex.trim().toUpperCase()
    if (row.color.trim() !== "" && hex !== "") {
      const colorKey = foldKey(row.color)
      const first = hexByColor.get(colorKey)
      if (!first) hexByColor.set(colorKey, { hex, row: index })
      else if (first.hex !== hex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "colorHex"],
          message: `Màu này đã dùng mã ${first.hex} ở biến thể ${first.row + 1}. Cùng tên màu phải cùng mã màu.`,
        })
      }
    }
    if (row.size.trim() !== "" && row.color.trim() !== "") {
      const key = `${foldKey(row.size)}|${foldKey(row.color)}`
      const first = pairRows.get(key)
      if (first === undefined) pairRows.set(key, index)
      else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "size"],
          message: `Size và màu này đã có ở biến thể ${first + 1}. Đổi size hoặc màu.`,
        })
      }
    }
  })
}
