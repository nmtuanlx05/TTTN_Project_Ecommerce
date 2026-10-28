import { z } from "zod"
import { NAME_MAX_LENGTH, SLUG_MAX_LENGTH, SLUG_REGEX } from "./constants"

/**
 * Quy tắc phản chiếu CreateCategoryDto của backend (docs/api/categories.md, mục Validate).
 * Message nói rõ sai ở đâu và sửa thế nào. Backend vẫn kiểm tra lại ở server.
 */
const name = z
  .string()
  .trim()
  .min(1, "Nhập tên danh mục, ví dụ Áo thun.")
  .max(NAME_MAX_LENGTH, `Tên danh mục tối đa ${NAME_MAX_LENGTH} ký tự. Rút gọn tên lại.`)

// Chuỗi rỗng được phép ở đây (= để backend tự sinh); form sửa siết thêm bên dưới.
const slug = z
  .string()
  .trim()
  .max(SLUG_MAX_LENGTH, `Slug tối đa ${SLUG_MAX_LENGTH} ký tự. Rút gọn slug lại.`)
  .refine((value) => value === "" || SLUG_REGEX.test(value), {
    message:
      "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ ao-thun-nam.",
  })

export const createCategorySchema = z.object({
  name,
  // null = danh mục gốc.
  parentId: z.number().int().nullable(),
  slug,
})

/** Khi sửa, slug không được để trống: backend từ chối chuỗi rỗng (400). */
export const updateCategorySchema = createCategorySchema.extend({
  slug: slug.refine((value) => value !== "", {
    message: "Nhập slug, hoặc giữ nguyên slug cũ.",
  }),
})

export type CategoryFormValues = z.infer<typeof createCategorySchema>
