export type Role = "ADMIN" | "STAFF" | "CUSTOMER"

/** Khớp đối tượng User của API. Backend không bao giờ trả `password`. */
export interface User {
  id: number
  email: string
  /** `null` với dữ liệu cũ; user mới luôn có tên. */
  name: string | null
  phone: string | null
  /** URL đầy đủ của ảnh đại diện, dùng thẳng trong `<img src>`; `null` = chưa có ảnh. */
  avatarUrl: string | null
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}
