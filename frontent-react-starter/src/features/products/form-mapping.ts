import { formatNumber } from "@/lib/format"
import { parsePriceInput } from "./price-input"
import { foldKey } from "./schema-checks"
import type { ProductFormValues, VariantFormValues } from "./schemas"
import type { CreateProductInput, ImageInput, ProductDetail, UpdateProductInput, UpdateVariantInput } from "./types"

export const EMPTY_VARIANT: VariantFormValues = {
  sku: "",
  size: "",
  color: "",
  colorHex: "",
  isActive: true,
}

export function emptyFormValues(): ProductFormValues {
  return {
    name: "",
    slug: "",
    description: "",
    price: "",
    images: [],
    categoryId: null,
    variants: [{ ...EMPTY_VARIANT }],
  }
}

/** URL ảnh đã lưu theo thứ tự hiển thị; chưa có dòng ảnh nào thì dự phòng cột cũ `imageUrl` (như backend khi đọc). */
export function savedImageUrls(product: Pick<ProductDetail, "images" | "imageUrl">): string[] {
  if (product.images.length > 0) {
    return [...product.images].sort((a, b) => a.sortOrder - b.sortOrder).map((image) => image.url)
  }
  return product.imageUrl ? [product.imageUrl] : []
}

/** Ảnh trong form → phần tử `images[]` gửi lên: có `assetId` (vừa tải) thì gửi `{ assetId }`, còn lại `{ url }`. */
export function toImageInput(image: ProductFormValues["images"][number]): ImageInput {
  return image.assetId !== undefined ? { assetId: image.assetId } : { url: image.url.trim() }
}

/** Mã màu so sánh/gửi lên dạng in hoa, rỗng = không có. */
const normalizeHex = (hex: string) => hex.trim().toUpperCase()

/** Chi tiết từ API → giá trị form. Trường `null` của API thành chuỗi rỗng; giá có dấu ngăn nghìn. */
export function toFormValues(product: ProductDetail): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: formatNumber(product.price),
    images: savedImageUrls(product).map((url) => ({ url })),
    categoryId: product.category.id,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      colorHex: variant.colorHex ?? "",
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
      ...(normalizeHex(row.colorHex) !== "" && {
        colorHex: normalizeHex(row.colorHex),
      }),
      isActive: row.isActive,
    })),
    images: values.images.map(toImageInput),
  }
  if (values.slug.trim() !== "") input.slug = values.slug.trim()
  if (values.description.trim() !== "") input.description = values.description.trim()
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
 * - `description` xóa trống thì gửi `null` (xóa giá trị), trống → trống thì không gửi;
 * - `images` chỉ gửi khi danh sách đổi (so theo thứ tự và url), gửi thì thay cả mảng (`[]` = xóa hết). Ảnh vừa tải gửi `{ assetId }`; ảnh đã có gửi
 *   `{ url }` vì API đọc sản phẩm không trả assetId (backend khớp URL Cloudinary đã đăng ký, ảnh cũ trên đĩa và URL ngoài);
 * - `colorHex` chỉ gửi khi đổi, nhưng đổi mã của một màu thì gửi CẢ các biến thể cùng màu (backend kiểm tra cùng màu cùng mã trên cả sản phẩm);
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

  const urls = values.images.map((image) => image.url.trim())
  const savedUrls = savedImageUrls(baseline)
  if (urls.length !== savedUrls.length || urls.some((url, index) => url !== savedUrls[index])) {
    input.images = values.images.map(toImageInput)
  }

  const variants: UpdateVariantInput[] = []
  const rowIndexes: number[] = []
  const savedById = new Map(baseline.variants.map((variant) => [variant.id, variant]))
  const hexChanged = (row: ProductFormValues["variants"][number]) => {
    const saved = row.id === undefined ? undefined : savedById.get(row.id)
    return saved !== undefined && normalizeHex(row.colorHex) !== normalizeHex(saved.colorHex ?? "")
  }
  // Màu có đổi mã (hoặc có biến thể đổi sang màu này): mọi biến thể cùng màu đều phải được gửi kèm mã.
  const touchedColors = new Set(
    values.variants
      .filter((row) => hexChanged(row) || (row.id !== undefined && row.color.trim() !== savedById.get(row.id)?.color))
      .map((row) => foldKey(row.color)),
  )

  values.variants.forEach((row, index) => {
    const sku = normalizeSku(row.sku)
    const size = row.size.trim()
    const color = row.color.trim()
    const hex = normalizeHex(row.colorHex)

    if (row.id === undefined) {
      variants.push({
        sku,
        size,
        color,
        ...(hex !== "" && { colorHex: hex }),
        isActive: row.isActive,
      })
      rowIndexes.push(index)
      return
    }

    const saved = savedById.get(row.id)
    if (!saved) return
    const changes: UpdateVariantInput = {}
    if (sku !== saved.sku) changes.sku = sku
    if (size !== saved.size) changes.size = size
    if (color !== saved.color) changes.color = color
    if (hexChanged(row) || touchedColors.has(foldKey(color))) changes.colorHex = hex || null
    if (row.isActive !== saved.isActive) changes.isActive = row.isActive
    if (Object.keys(changes).length > 0) {
      variants.push({ id: row.id, ...changes })
      rowIndexes.push(index)
    }
  })

  if (variants.length > 0) input.variants = variants
  return { input, rowIndexes }
}
