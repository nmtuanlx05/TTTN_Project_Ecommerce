import type { Role, UserSortBy } from "@/types/user"

export const PAGE_SIZE = 10

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  CUSTOMER: "Khách hàng",
}

export const ROLES = Object.keys(ROLE_LABEL) as Role[]

export const SORTABLE_COLUMNS: readonly UserSortBy[] = ["createdAt", "name", "email"]

/** Mặc định của backend: mới nhất trước. Giá trị mặc định không ghi lên URL. */
export const DEFAULT_SORT = { sortBy: "createdAt", order: "desc" } as const

export const ACTIVE_LABEL = { active: "Hoạt động", locked: "Đã khóa" } as const

/** Mô tả quyền theo docs/01-actor-phan-quyen.md, hiện dưới ô chọn vai trò. */
export const ROLE_DESCRIPTION: Record<Role, string> = {
  ADMIN: "Toàn quyền, kể cả khóa người dùng và xem doanh thu.",
  STAFF: "Vận hành sản phẩm, kho và đơn hàng. Không khóa người dùng, không xem doanh thu.",
  CUSTOMER: "Mua hàng trên website, không vào được trang quản trị.",
}

/** Khớp `@MinLength` của CreateUserDto ở backend. */
export const PASSWORD_MIN_LENGTH = 6

/** Khớp `VN_PHONE_REGEX` ở backend: 0xxxxxxxxx hoặc +84xxxxxxxxx, đầu số 3/5/7/8/9. */
export const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/
