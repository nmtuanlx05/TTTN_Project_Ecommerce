import { z } from "zod"
import {
  COLOR_HEX_REGEX,
  COLOR_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  IMAGE_URL_MAX_LENGTH,
  IMAGE_URL_REGEX,
  MAX_PRODUCT_IMAGES,
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
import { checkDuplicateImages, checkDuplicateVariants } from "./schema-checks"

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
  .refine((value): boolean => value !== null, {
    message: "Chọn danh mục cho sản phẩm.",
  })

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

/**
 * Một ảnh trong form. `assetId` chỉ có ở ảnh vừa tải lên trong phiên này (API đọc sản phẩm không trả assetId): khi gửi thì ưu tiên `assetId`.
 * `url` không ép https vì ảnh cũ đã lưu có thể là `http://localhost/uploads/...`; chỉ ô "Thêm ảnh bằng URL" mới siết https cho URL mới.
 */
const imageItem = z.object({
  assetId: z.number().int().positive().optional(),
  url: z
    .string()
    .trim()
    .min(1, "Đường dẫn ảnh không được để trống.")
    .max(IMAGE_URL_MAX_LENGTH, `Đường dẫn ảnh tối đa ${IMAGE_URL_MAX_LENGTH} ký tự. Dùng đường dẫn ngắn hơn.`)
    .regex(IMAGE_URL_REGEX, "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://."),
})

const images = z.array(imageItem).max(MAX_PRODUCT_IMAGES, `Mỗi sản phẩm tối đa ${MAX_PRODUCT_IMAGES} ảnh. Xóa bớt ảnh.`)

const variant = z.object({
  /** Có = biến thể đã lưu (không xóa được, chỉ sửa hoặc ẩn); không có = hàng mới thêm. */
  id: z.number().int().optional(),
  sku: z
    .string()
    .trim()
    .min(1, "Nhập SKU, ví dụ ATB-S-TRANG.")
    .max(SKU_MAX_LENGTH, `SKU tối đa ${SKU_MAX_LENGTH} ký tự. Rút gọn SKU lại.`)
    .regex(SKU_REGEX, "SKU chỉ gồm chữ cái không dấu, số và các ký tự . _ - (không có khoảng trắng)."),
  size: z.string().trim().min(1, "Nhập size, ví dụ M.").max(SIZE_MAX_LENGTH, `Size tối đa ${SIZE_MAX_LENGTH} ký tự.`),
  color: z
    .string()
    .trim()
    .min(1, "Nhập màu, ví dụ Trắng.")
    .max(COLOR_MAX_LENGTH, `Màu tối đa ${COLOR_MAX_LENGTH} ký tự.`),
  /** Rỗng = chưa có mã màu (storefront rơi về nút chữ). */
  colorHex: z
    .string()
    .trim()
    .refine((value) => value === "" || COLOR_HEX_REGEX.test(value), {
      message: "Mã màu phải có dạng #RRGGBB, ví dụ #FFFFFF hoặc #1A1A1A.",
    }),
  isActive: z.boolean(),
})

export type VariantFormValues = z.infer<typeof variant>

const variants = z
  .array(variant)
  .min(1, "Sản phẩm cần ít nhất 1 biến thể. Thêm một biến thể (size và màu).")
  .max(MAX_VARIANTS, `Mỗi sản phẩm tối đa ${MAX_VARIANTS} biến thể.`)

const baseShape = { name, description, price, images, categoryId, variants }

function checkForm(value: z.infer<z.ZodObject<typeof baseShape>>, ctx: z.RefinementCtx) {
  checkDuplicateImages(value, ctx)
  checkDuplicateVariants(value, ctx)
}

export const createProductSchema = z.object({ ...baseShape, slug }).superRefine(checkForm)

/** Khi sửa, slug không được để trống: backend từ chối chuỗi rỗng (400). */
export const updateProductSchema = z
  .object({
    ...baseShape,
    slug: slug.refine((value) => value !== "", {
      message: "Nhập slug, hoặc giữ nguyên slug cũ.",
    }),
  })
  .superRefine(checkForm)

export type ProductFormValues = z.infer<typeof createProductSchema>
