import type { Path } from "react-hook-form"
import { ApiError } from "@/lib/api-error"
import type { ProductFormValues } from "./schemas"

const VARIANT_FIELD = /^variants\.(\d+)\.(.+)$/

/**
 * Đổi chỉ số `variants.N.*` trong lỗi 400 của PATCH từ chỉ số mảng đã gửi sang chỉ số hàng trong form.
 * Lỗi của hàng không còn trong bảng (không thể xảy ra nếu backend đúng) thì chuyển thành lỗi chung.
 */
export function remapVariantErrors(error: ApiError, rowIndexes: number[]): ApiError {
  const errors = error.errors.map((item) => {
    const match = VARIANT_FIELD.exec(item.field)
    if (!match) return item
    const row = rowIndexes[Number(match[1])]
    return row === undefined ? { ...item, field: "variants" } : { ...item, field: `variants.${row}.${match[2]}` }
  })
  return new ApiError(error.statusCode, error.message, errors, error.code)
}

/** Các ô nhìn thấy trong form, để `applyServerErrors` gắn lỗi 400 của server vào đúng ô. */
export function formFieldPaths(variantCount: number): Path<ProductFormValues>[] {
  const paths: Path<ProductFormValues>[] = ["name", "slug", "description", "price", "images", "categoryId"]
  for (let index = 0; index < variantCount; index += 1) {
    paths.push(
      `variants.${index}.sku`,
      `variants.${index}.size`,
      `variants.${index}.color`,
      `variants.${index}.colorHex`,
      `variants.${index}.isActive`,
    )
  }
  return paths
}

const IMAGE_FIELD = /^images\.\d+(\.(url|assetId))?$/

/** Mã lỗi ảnh của backend (docs/api/products.md, "Nguồn ảnh hợp lệ") → câu tiếng Việt cho người dùng. */
const IMAGE_CODE_MESSAGE: Record<string, string> = {
  EXTERNAL_IMAGE_NOT_ALLOWED:
    "Máy chủ không cho dùng ảnh từ đường dẫn bên ngoài. Hãy xóa ảnh đó và tải ảnh lên từ máy.",
  MEDIA_ASSET_INVALID:
    "Có ảnh không còn hiệu lực (đã bị xóa hoặc không phải ảnh sản phẩm do hệ thống lưu). Hãy xóa ảnh đó rồi tải lại.",
}

/**
 * Lỗi 400 theo từng ảnh (`images.N.url`, `images.N.assetId`) gộp về ô chung `images`, vì danh sách ảnh chỉ có một chỗ báo lỗi.
 * Lỗi có mã ảnh của backend (`EXTERNAL_IMAGE_NOT_ALLOWED`, `MEDIA_ASSET_INVALID`) được báo bằng câu của frontend ở ô `images`,
 * kể cả khi server không kèm `errors` theo ô.
 */
export function collapseImageErrors(error: ApiError): ApiError {
  const known = error.code ? IMAGE_CODE_MESSAGE[error.code] : undefined
  if (known) {
    const rest = error.errors.filter((item) => !IMAGE_FIELD.test(item.field))
    return new ApiError(error.statusCode, error.message, [...rest, { field: "images", message: known }], error.code)
  }
  const errors = error.errors.map((item) => (IMAGE_FIELD.test(item.field) ? { ...item, field: "images" } : item))
  return new ApiError(error.statusCode, error.message, errors, error.code)
}
