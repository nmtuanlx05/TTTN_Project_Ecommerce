import type { SortOrder } from "@/types/api"

export type VoucherStatus = "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED" | "EXHAUSTED"
export type DiscountType = "PERCENT" | "FIXED"
export type VoucherSortBy = "createdAt" | "code" | "startsAt" | "expiresAt" | "usedCount"

/** Một voucher trong API quản trị (docs/api/vouchers.md). Ngày hiển thị dùng `*Date` (YYYY-MM-DD giờ VN), không parse `startsAt`/`expiresAt`. */
export interface Voucher {
  id: number
  code: string
  description: string | null
  discountType: DiscountType
  discountValue: number
  maxDiscount: number | null
  minOrderValue: number
  usageLimit: number | null
  usedCount: number
  remainingUses: number | null
  startsAt: string
  expiresAt: string
  startsAtDate: string
  expiresAtDate: string
  isActive: boolean
  /** Suy ra ở backend, không lưu DB. Switch chỉ phản ánh `isActive`. */
  status: VoucherStatus
  createdAt: string
  updatedAt: string
}

/** Thống kê của `GET /admin/vouchers/:id`; đơn đã hủy không tính vào `ordersCount`/`totalDiscount`. */
export interface VoucherStats {
  usedCount: number
  ordersCount: number
  totalDiscount: number
}

export interface VoucherDetail extends Voucher {
  stats: VoucherStats
}

/** Query của GET /admin/vouchers. Trường nào bỏ trống thì không gửi lên. */
export interface VoucherListParams {
  q?: string
  status?: VoucherStatus
  sortBy?: VoucherSortBy
  order?: SortOrder
  page?: number
  limit?: number
}

export interface CreateVoucherInput {
  code: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  maxDiscount?: number | null
  minOrderValue?: number
  /** `null` = không giới hạn. */
  usageLimit?: number | null
  startsAtDate: string
  expiresAtDate: string
}

/** PATCH chỉ gửi trường đã đổi; `null` ở `description`/`maxDiscount`/`usageLimit` nghĩa là xóa giá trị. */
export type UpdateVoucherInput = Partial<CreateVoucherInput>
