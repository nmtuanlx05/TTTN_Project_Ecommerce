import type { SortOrder } from "@/types/api"

export type Role = "ADMIN" | "STAFF" | "CUSTOMER"

/** Khớp đối tượng User của API. Backend không bao giờ trả `password`. */
export interface User {
  id: number
  email: string
  /** `null` với dữ liệu cũ; user mới luôn có tên. */
  name: string | null
  phone: string | null
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UserSortBy = "createdAt" | "name" | "email"

/** Query của GET /users. Trường nào bỏ trống thì không gửi lên. */
export interface UserListParams {
  q?: string
  role?: Role
  isActive?: boolean
  sortBy?: UserSortBy
  order?: SortOrder
  page?: number
  limit?: number
}

export interface CreateUserInput {
  email: string
  password: string
  name: string
  phone?: string
  role?: Role
}

/**
 * PATCH /users/:id chỉ nhận name, phone, role. Gửi email/password sẽ bị 400.
 * `phone: null` xóa số điện thoại (backend bỏ qua null ở bước validate rồi ghi NULL);
 * bỏ trống `phone` thì giữ nguyên số cũ.
 */
export interface UpdateUserInput {
  name?: string
  phone?: string | null
  role?: Role
}

export interface UpdateUserStatusInput {
  isActive: boolean
}
