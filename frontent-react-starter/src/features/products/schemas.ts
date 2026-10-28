import { z } from "zod"
import {
  COLOR_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  IMAGE_URL_MAX_LENGTH,
  IMAGE_URL_REGEX,
  MAX_VARIANTS,
  NAME_MAX_LENGTH,
  PRICE_MAX,
  SIZE_MAX_LENGTH,
  SKU_MAX_LENGTH,
  SKU_REGEX,
  SLUG_MAX_LENGTH,
  SLUG_REGEX,
} from "./constants"
import { parsePriceInput } from "./price-input"

/**
 * Quy tắc phản chiếu CreateProductDto / CreateVariantDto của backend (docs/api/products.md, mục Validate).
 * Message nói rõ sai ở đâu và sửa thế nào. Backend vẫn kiểm tra lại ở server.
 */
const name = z
  .string()
  .trim()
  .min(1, "Nhập tên sản phẩm, ví dụ Áo thun basic cổ tròn.")
  .max(NAME_MAX_LENGTH, `Tên sản phẩm tối đa ${NAME_MAX_LENGTH} ký tự. Rút gọn tên lại.`)

// Chuỗi rỗng được phép ở đây (= để backend tự sinh); form sửa siết thêm bên dưới.
const slug = z
  .string()
  .trim()
  .max(SLUG_MAX_LENGTH, `Slug tối đa ${SLUG_MAX_LENGTH} ký tự. Rút gọn slug lại.`)
  .refine((value) => value === "" || SLUG_REGEX.test(value), {
    message: "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ ao-thun-basic.",
  })

const categoryId = z
  .number()
  .int()
  .nullable()
  // Khai báo `: boolean` để TS không suy ra type predicate, nếu không kiểu form bị thu hẹp về `number`
  // và giá trị ban đầu `null` (chưa chọn) không hợp lệ.
  .refine((value): boolean => value !== null, { message: "Chọn danh mục cho sản phẩm." })

// Giá là chuỗi trong form (để gõ "199.000"); lúc gửi mới ép sang số nguyên.
const price = z
  .string()
  .trim()
  .min(1, "Nhập giá bán, ví dụ 199000.")
  .superRefine((value, ctx) => {
    if (value === "") return
    const parsed = parsePriceInput(value)
    if (parsed === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Giá phải là số nguyên VND, chỉ gồm chữ số, ví dụ 199000.",
      })
    } else if (parsed > PRICE_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Giá không được vượt quá ${PRICE_MAX}. Nhập số nhỏ hơn.`,
      })
    }
  })

const description = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự. Rút gọn mô tả lại.`)

const imageUrl = z
  .string()
  .trim()
  .max(IMAGE_URL_MAX_LENGTH, `Đường dẫn ảnh tối đa ${IMAGE_URL_MAX_LENGTH} ký tự. Dùng đường dẫn ngắn hơn.`)
  .refine((value) => value === "" || IMAGE_URL_REGEX.test(value), {
    message: "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://.",
  })

const variant = z.object({
  /** Có = biến thể đã lưu (không xóa được, chỉ sửa hoặc ẩn); không có = hàng mới thêm. */
  id: z.number().int().optional(),
  sku: z
    .string()
    .trim()
    .min(1, "Nhập SKU, ví dụ ATB-S-TRANG.")
    .max(SKU_MAX_LENGTH, `SKU tối đa ${SKU_MAX_LENGTH} ký tự. Rút gọn SKU lại.`)
    .regex(SKU_REGEX, "SKU chỉ gồm chữ cái không dấu, số và các ký tự . _ - (không có khoảng trắng)."),
  size: z
    .string()
    .trim()
    .min(1, "Nhập size, ví dụ M.")
    .max(SIZE_MAX_LENGTH, `Size tối đa ${SIZE_MAX_LENGTH} ký tự.`),
  color: z
    .string()
    .trim()
    .min(1, "Nhập màu, ví dụ Trắng.")
    .max(COLOR_MAX_LENGTH, `Màu tối đa ${COLOR_MAX_LENGTH} ký tự.`),
  isActive: z.boolean(),
})

export type VariantFormValues = z.infer<typeof variant>

const variants = z
  .array(variant)
  .min(1, "Sản phẩm cần ít nhất 1 biến thể. Thêm một biến thể (size và màu).")
  .max(MAX_VARIANTS, `Mỗi sản phẩm tối đa ${MAX_VARIANTS} biến thể.`)

/**
 * So khóa không phân biệt hoa/thường và dấu như collation của DB ("Trắng" và "trang" là một),
 * để báo trùng ngay trong form thay vì chờ backend trả 400.
 */
export function foldKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
}

/** Chặn trùng SKU và trùng cặp (size, màu) trong cùng form; lỗi gắn vào ô của hàng đứng sau. */
function checkDuplicateVariants(
  value: { variants: { sku: string; size: string; color: string }[] },
  ctx: z.RefinementCtx,
) {
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

const baseShape = { name, description, price, imageUrl, categoryId, variants }

export const createProductSchema = z
  .object({ ...baseShape, slug })
  .superRefine(checkDuplicateVariants)

/** Khi sửa, slug không được để trống: backend từ chối chuỗi rỗng (400). */
export const updateProductSchema = z
  .object({
    ...baseShape,
    slug: slug.refine((value) => value !== "", { message: "Nhập slug, hoặc giữ nguyên slug cũ." }),
  })
  .superRefine(checkDuplicateVariants)

export type ProductFormValues = z.infer<typeof createProductSchema>
