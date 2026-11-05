import { todayVn } from "@/lib/format"
import { addDaysYmd } from "@/lib/ymd"
import { DEFAULT_VALID_DAYS } from "./constants"
import { parseInteger } from "./parse-int"
import type { VoucherFormValues } from "./schemas"
import type { CreateVoucherInput, UpdateVoucherInput, Voucher } from "./types"

/** Giá trị ban đầu của form: voucher có sẵn (sửa) hoặc mặc định (tạo: phần trăm, hôm nay → +30 ngày, không giới hạn lượt). */
export function toFormValues(voucher: Voucher | null): VoucherFormValues {
  if (!voucher) {
    const today = todayVn()
    return {
      code: "",
      description: "",
      discountType: "PERCENT",
      discountValue: "",
      maxDiscount: "",
      minOrderValue: "0",
      unlimited: true,
      usageLimit: "",
      startsAtDate: today,
      expiresAtDate: addDaysYmd(today, DEFAULT_VALID_DAYS),
    }
  }
  return {
    code: voucher.code,
    description: voucher.description ?? "",
    discountType: voucher.discountType,
    discountValue: String(voucher.discountValue),
    maxDiscount: voucher.maxDiscount === null ? "" : String(voucher.maxDiscount),
    minOrderValue: String(voucher.minOrderValue),
    unlimited: voucher.usageLimit === null,
    usageLimit: voucher.usageLimit === null ? "" : String(voucher.usageLimit),
    startsAtDate: voucher.startsAtDate,
    expiresAtDate: voucher.expiresAtDate,
  }
}

/** Giá trị gửi lên cho từng trường ở dạng "đã chuẩn hóa"; `null` là xóa giá trị. */
function normalize(values: VoucherFormValues) {
  const maxDiscount =
    values.discountType === "PERCENT" && values.maxDiscount.trim()
      ? parseInteger(values.maxDiscount)
      : null
  return {
    code: values.code.trim().toUpperCase(),
    description: values.description.trim() || null,
    discountType: values.discountType,
    discountValue: parseInteger(values.discountValue),
    maxDiscount,
    minOrderValue: parseInteger(values.minOrderValue),
    usageLimit: values.unlimited ? null : parseInteger(values.usageLimit),
    startsAtDate: values.startsAtDate,
    expiresAtDate: values.expiresAtDate,
  }
}

export function buildCreateInput(values: VoucherFormValues): CreateVoucherInput {
  return normalize(values)
}

/** Trường bị khóa khi voucher đã có người dùng: không bao giờ nằm trong payload sửa. */
const LOCKED_KEYS = ["code", "discountType", "discountValue", "maxDiscount", "startsAtDate"] as const

/**
 * Chỉ gồm trường thật sự đổi. Xóa giá trị (bật "Không giới hạn", xóa/đổi sang FIXED mất `maxDiscount`, xóa mô tả)
 * gửi `null` rõ ràng chứ không bỏ trường. Rỗng nghĩa là không có gì để lưu.
 */
export function buildUpdateInput(
  voucher: Voucher,
  values: VoucherFormValues,
  locked: boolean,
): UpdateVoucherInput {
  const next = normalize(values)
  const input: Record<string, unknown> = {}
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (locked && (LOCKED_KEYS as readonly string[]).includes(key)) continue
    if (next[key] !== voucher[key]) input[key] = next[key]
  }
  return input as UpdateVoucherInput
}
