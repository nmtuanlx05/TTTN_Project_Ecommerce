import type { SortOrder } from "@/types/api"

export type ProductSortBy = "createdAt" | "price" | "name"

/** Một dòng trong danh sách admin (GET /admin/products). Không có mô tả và tồn kho. */
export interface ProductListItem {
  id: number
  name: string
  slug: string
  /** VND, số nguyên. */
  price: number
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  category: { id: number; name: string }
  variantCount: number
  /** Số biến thể đang bán (`isActive = true`). */
  activeVariantCount: number
}

/** Biến thể trong chi tiết admin. `stock`, `reserved`, `minStock` chỉ đọc: module Kho quản lý. */
export interface ProductVariant {
  id: number
  sku: string
  size: string
  color: string
  isActive: boolean
  stock: number
  reserved: number
  minStock: number
}

/** Chi tiết admin (GET /admin/products/:id và response của POST/PATCH). Gồm cả biến thể đang ẩn. */
export interface ProductDetail {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  category: { id: number; name: string; slug: string }
  variants: ProductVariant[]
}

/** Query của GET /admin/products. Trường nào bỏ trống thì không gửi lên. */
export interface ProductListParams {
  q?: string
  /** Khớp đúng danh mục này, không gồm danh mục con. */
  categoryId?: number
  isActive?: boolean
  sortBy?: ProductSortBy
  order?: SortOrder
  page?: number
  limit?: number
}

export interface CreateVariantInput {
  sku: string
  size: string
  color: string
  isActive?: boolean
}

/** Bỏ `slug`, `description`, `imageUrl` = không có (slug thì backend tự sinh). Không gửi `isActive`. */
export interface CreateProductInput {
  name: string
  slug?: string
  description?: string
  price: number
  imageUrl?: string
  categoryId: number
  variants: CreateVariantInput[]
}

/**
 * Có `id` = cập nhật biến thể đó (chỉ trường được gửi mới đổi); không có `id` = tạo mới và phải đủ
 * `sku`, `size`, `color`. Không có `stock`/`reserved`/`minStock`: backend từ chối (400).
 */
export interface UpdateVariantInput {
  id?: number
  sku?: string
  size?: string
  color?: string
  isActive?: boolean
}

/**
 * Trường không gửi thì giữ nguyên. `description` và `imageUrl` gửi `null` để xóa giá trị.
 * Biến thể không nằm trong `variants` thì được giữ nguyên (không bao giờ bị xóa).
 */
export interface UpdateProductInput {
  name?: string
  slug?: string
  description?: string | null
  price?: number
  imageUrl?: string | null
  categoryId?: number
  variants?: UpdateVariantInput[]
}
