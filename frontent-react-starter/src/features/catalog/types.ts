import type { SortOrder } from "@/types/api"

/** Kiểu của API công khai (docs/api/products.md, GET /products). Không có tồn kho, chỉ biết còn/hết. */

export interface CatalogCategoryRef {
  id: number
  name: string
  slug: string
}

/** Màu của một sản phẩm trong danh sách; `hex` (#RRGGBB in hoa) là null khi admin chưa nhập mã màu. */
export interface CatalogColor {
  name: string
  hex: string | null
}

/** Một thẻ trong danh sách (GET /products). */
export interface CatalogProductListItem {
  id: number
  name: string
  slug: string
  /** VND, số nguyên. */
  price: number
  /** Ảnh đầu (ảnh đại diện). */
  imageUrl: string | null
  /** Ảnh thứ hai (hiện khi rê chuột); null nếu sản phẩm chỉ có một ảnh. Chỉ có ở danh sách. */
  secondImageUrl: string | null
  /** Các màu của sản phẩm, chỉ có ở danh sách. */
  colors: CatalogColor[]
  category: CatalogCategoryRef
  /** Còn ít nhất một biến thể đang bán có tồn khả dụng. */
  inStock: boolean
  /** Còn hàng nhưng mọi biến thể còn hàng đều sắp hết (ngưỡng `minStock` do kho đặt). `true` luôn kéo theo `inStock`. Chỉ có ở danh sách. */
  lowStock: boolean
}

/** Biến thể đang bán. Có `sku` nhưng giao diện khách không hiển thị. */
export interface CatalogVariant {
  id: number
  sku: string
  size: string
  color: string
  /** `#RRGGBB` in hoa; null khi chưa có mã màu (ô chọn màu rơi về nút chữ). */
  colorHex: string | null
  inStock: boolean
}

/** Chi tiết (GET /products/:slug). Không có `lowStock`: huy hiệu "Sắp hết" chỉ hiện ở thẻ trong danh sách. */
export interface CatalogProductDetail extends Omit<CatalogProductListItem, "lowStock" | "secondImageUrl" | "colors"> {
  description: string | null
  /** Ảnh đã sắp xếp, tối đa 6. Rỗng thì dự phòng bằng `imageUrl`. */
  images: { url: string }[]
  variants: CatalogVariant[]
}

/** Ba kiểu sắp xếp của storefront; `newest` là mặc định của backend. */
export type CatalogSort = "newest" | "price-asc" | "price-desc"

/** Query của GET /products. Trường nào bỏ trống thì không gửi lên. */
export interface CatalogListParams {
  q?: string
  categoryId?: number
  minPrice?: number
  maxPrice?: number
  excludeId?: number
  sortBy?: "createdAt" | "price"
  order?: SortOrder
  page?: number
  limit?: number
}
