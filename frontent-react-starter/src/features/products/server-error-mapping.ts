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
  return new ApiError(error.statusCode, error.message, errors)
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

const IMAGE_FIELD = /^images\.\d+(\.url)?$/

/** Lỗi 400 theo từng ảnh (`images.N.url`) gộp về ô chung `images`, vì danh sách ảnh chỉ có một chỗ báo lỗi. */
export function collapseImageErrors(error: ApiError): ApiError {
  const errors = error.errors.map((item) => (IMAGE_FIELD.test(item.field) ? { ...item, field: "images" } : item))
  return new ApiError(error.statusCode, error.message, errors)
}
