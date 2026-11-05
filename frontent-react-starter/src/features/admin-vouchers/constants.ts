import type { ComponentProps } from "react"
import type { Badge } from "@/components/ui/badge"
import type { VoucherSortBy, VoucherStatus } from "./types"

export const PAGE_SIZE = 10

/** Giới hạn khớp `vouchers.constants.ts` của backend: mô tả ≤ 191 ký tự, mã 3–30 ký tự A-Z 0-9 _ -. */
export const DESCRIPTION_MAX_LENGTH = 191
export const MAX_INT = 2_147_483_647
export const VOUCHER_CODE_REGEX = /^[A-Z0-9_-]{3,30}$/
/** Voucher mới áp dụng bao nhiêu ngày kể từ hôm nay (mặc định của form tạo). */
export const DEFAULT_VALID_DAYS = 30

export const STATUS_LABEL: Record<VoucherStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Đã tắt",
  SCHEDULED: "Sắp diễn ra",
  EXPIRED: "Hết hạn",
  EXHAUSTED: "Hết lượt",
}

export const STATUSES = Object.keys(STATUS_LABEL) as VoucherStatus[]

type BadgeVariant = ComponentProps<typeof Badge>["variant"]

/** Mượn variant của badge đơn hàng/thanh toán (không sửa badge.tsx): ACTIVE dùng xanh lá của "Đã thanh toán". */
export const STATUS_BADGE: Record<VoucherStatus, BadgeVariant> = {
  ACTIVE: "paid",
  INACTIVE: "cancelled",
  SCHEDULED: "confirmed",
  EXHAUSTED: "pending",
  EXPIRED: "returned",
}

export const SORT_FIELDS: readonly VoucherSortBy[] = [
  "createdAt",
  "code",
  "startsAt",
  "expiresAt",
  "usedCount",
]

/** Cột có nút sắp xếp ở tiêu đề (id cột trùng tên trường `sortBy`). */
export const SORTABLE_COLUMNS: readonly VoucherSortBy[] = ["code", "startsAt", "usedCount"]

/** Mặc định của backend: mới nhất trước. Giá trị mặc định không ghi lên URL. */
export const DEFAULT_SORT = { sortBy: "createdAt", order: "desc" } as const
