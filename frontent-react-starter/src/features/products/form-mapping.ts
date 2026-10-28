import type { Path } from "react-hook-form"
import { ApiError } from "@/lib/api-error"
import { formatNumber } from "@/lib/format"
import { parsePriceInput } from "./price-input"
import type { ProductFormValues, VariantFormValues } from "./schemas"
import type {
  CreateProductInput,
  ProductDetail,
  UpdateProductInput,
  UpdateVariantInput,
} from "./types"

export const EMPTY_VARIANT: VariantFormValues = { sku: "", size: "", color: "", isActive: true }

export function emptyFormValues(): ProductFormValues {
  return {
    name: "",
    slug: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: null,
    variants: [{ ...EMPTY_VARIANT }],
  }
}

/** Chi tiết từ API → giá trị form. Trường `null` của API thành chuỗi rỗng; giá có dấu ngăn nghìn. */
export function toFormValues(product: ProductDetail): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: formatNumber(product.price),
    imageUrl: product.imageUrl ?? "",
    categoryId: product.category.id,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      isActive: variant.isActive,
    })),
  }
}

/** Backend tự đổi SKU sang chữ in hoa; làm trước ở client để so sánh khớp với dữ liệu đã lưu. */
function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase()
}

/**
 * Giá trị form đã qua zod nên giá luôn parse được. Trường tùy chọn bỏ trống thì không gửi:
 * `slug: ""` bị backend từ chối (400), muốn tự sinh phải bỏ hẳn trường.
 */
export function buildCreateInput(values: ProductFormValues): CreateProductInput {
  const input: CreateProductInput = {
    name: values.name.trim(),
    price: parsePriceInput(values.price) ?? 0,
    categoryId: values.categoryId as number,
    variants: values.variants.map((row) => ({
      sku: normalizeSku(row.sku),
      size: row.size.trim(),
      color: row.color.trim(),
      isActive: row.isActive,
    })),
  }
  if (values.slug.trim() !== "") input.slug = values.slug.trim()
  if (values.description.trim() !== "") input.description = values.description.trim()
  if (values.imageUrl.trim() !== "") input.imageUrl = values.imageUrl.trim()
  return input
}

export interface PreparedUpdate {
  input: UpdateProductInput
  /**
   * Chỉ số hàng trong form của từng phần tử `input.variants`. Backend báo lỗi theo chỉ số trong mảng
   * đã gửi (`variants.N.sku`), mà ta chỉ gửi các hàng có đổi, nên cần bảng này để gắn lỗi đúng ô.
   */
  rowIndexes: number[]
}

/**
 * PATCH chỉ gửi phần thật sự đổi so với `baseline` (dữ liệu đã lưu):
 * - `description`/`imageUrl` xóa trống thì gửi `null` (xóa giá trị), trống → trống thì không gửi;
 * - biến thể có `id` chỉ gửi các trường đổi, không đổi thì bỏ qua (backend giữ nguyên);
 * - biến thể chưa có `id` là hàng mới, gửi đủ sku/size/color/isActive.
 */
export function buildUpdateInput(baseline: ProductDetail, values: ProductFormValues): PreparedUpdate {
  const input: UpdateProductInput = {}

  const name = values.name.trim()
  if (name !== baseline.name) input.name = name

  const slug = values.slug.trim()
  if (slug !== baseline.slug) input.slug = slug

  const price = parsePriceInput(values.price)
  if (price !== null && price !== baseline.price) input.price = price

  if (values.categoryId !== null && values.categoryId !== baseline.category.id) {
    input.categoryId = values.categoryId
  }

  const description = values.description.trim()
  if (description !== (baseline.description ?? "")) input.description = description || null

  const imageUrl = values.imageUrl.trim()
  if (imageUrl !== (baseline.imageUrl ?? "")) input.imageUrl = imageUrl || null

  const variants: UpdateVariantInput[] = []
  const rowIndexes: number[] = []
  const savedById = new Map(baseline.variants.map((variant) => [variant.id, variant]))

  values.variants.forEach((row, index) => {
    const sku = normalizeSku(row.sku)
    const size = row.size.trim()
    const color = row.color.trim()

    if (row.id === undefined) {
      variants.push({ sku, size, color, isActive: row.isActive })
      rowIndexes.push(index)
      return
    }

    const saved = savedById.get(row.id)
    if (!saved) return
    const changes: UpdateVariantInput = {}
    if (sku !== saved.sku) changes.sku = sku
    if (size !== saved.size) changes.size = size
    if (color !== saved.color) changes.color = color
    if (row.isActive !== saved.isActive) changes.isActive = row.isActive
    if (Object.keys(changes).length > 0) {
      variants.push({ id: row.id, ...changes })
      rowIndexes.push(index)
    }
  })

  if (variants.length > 0) input.variants = variants
  return { input, rowIndexes }
}

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
  const paths: Path<ProductFormValues>[] = [
    "name",
    "slug",
    "description",
    "price",
    "imageUrl",
    "categoryId",
  ]
  for (let index = 0; index < variantCount; index += 1) {
    paths.push(
      `variants.${index}.sku`,
      `variants.${index}.size`,
      `variants.${index}.color`,
      `variants.${index}.isActive`,
    )
  }
  return paths
}
