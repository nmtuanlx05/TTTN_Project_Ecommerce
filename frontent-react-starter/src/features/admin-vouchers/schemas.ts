import { z } from "zod"
import { DESCRIPTION_MAX_LENGTH, MAX_INT, VOUCHER_CODE_REGEX } from "./constants"
import { parseInteger } from "./parse-int"

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Form giữ mọi ô số dạng chuỗi (ô trống hợp lệ khi gõ dở); chuyển sang số ở `form-mapping.ts`.
 * Quy tắc phản chiếu `vouchers.config.ts` của backend; backend vẫn kiểm tra lại.
 */
export const voucherFormSchema = z.object({
  code: z.string(),
  description: z.string(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.string(),
  maxDiscount: z.string(),
  minOrderValue: z.string(),
  unlimited: z.boolean(),
  usageLimit: z.string(),
  startsAtDate: z.string(),
  expiresAtDate: z.string(),
})

export type VoucherFormValues = z.infer<typeof voucherFormSchema>

export interface VoucherSchemaOptions {
  mode: "create" | "edit"
  /** Voucher đã được dùng: các ô bị khóa không kiểm (giá trị cũ có thể lệch chuẩn, vd. voucher seed). */
  locked: boolean
  usedCount: number
  /** Hôm nay theo giờ VN (YYYY-MM-DD); chỉ dùng khi tạo. */
  today: string
}

const isInt = (n: number, min: number) => Number.isInteger(n) && n >= min && n <= MAX_INT

export function makeVoucherSchema({ mode, locked, usedCount, today }: VoucherSchemaOptions) {
  return voucherFormSchema.superRefine((values, ctx) => {
    const fail = (path: keyof VoucherFormValues, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

    if (!locked) {
      const code = values.code.trim().toUpperCase()
      if (!code) fail("code", "Nhập mã voucher.")
      else if (!VOUCHER_CODE_REGEX.test(code))
        fail("code", "Mã gồm 3 đến 30 ký tự: chữ A-Z, số 0-9, dấu gạch dưới hoặc gạch ngang.")

      const value = parseInteger(values.discountValue)
      if (values.discountType === "PERCENT") {
        if (!isInt(value, 1) || value > 100)
          fail("discountValue", "Phần trăm giảm phải là số nguyên từ 1 đến 100.")
        if (values.maxDiscount.trim() && !isInt(parseInteger(values.maxDiscount), 1))
          fail("maxDiscount", "Mức giảm tối đa phải là số nguyên lớn hơn 0, hoặc để trống nếu không giới hạn.")
      } else if (!isInt(value, 1)) {
        fail("discountValue", "Số tiền giảm phải là số nguyên lớn hơn 0.")
      }
    }

    if (values.description.trim().length > DESCRIPTION_MAX_LENGTH)
      fail("description", `Mô tả không quá ${DESCRIPTION_MAX_LENGTH} ký tự.`)

    if (!isInt(parseInteger(values.minOrderValue), 0))
      fail("minOrderValue", "Đơn tối thiểu phải là số nguyên từ 0 trở lên, nhập 0 nếu không yêu cầu.")

    if (!values.unlimited) {
      const limit = parseInteger(values.usageLimit)
      if (!isInt(limit, 1))
        fail("usageLimit", 'Nhập số lượt dùng từ 1 trở lên, hoặc bật "Không giới hạn".')
      else if (limit < usedCount)
        fail("usageLimit", `Không được thấp hơn số lượt đã dùng (${usedCount}).`)
    }

    const validStart = YMD_REGEX.test(values.startsAtDate)
    const validEnd = YMD_REGEX.test(values.expiresAtDate)
    if (!validStart) fail("startsAtDate", "Chọn ngày bắt đầu hợp lệ.")
    if (!validEnd) fail("expiresAtDate", "Chọn ngày kết thúc hợp lệ.")
    if (validStart && validEnd) {
      // Backend tính hết ngày kết thúc nên cùng một ngày vẫn hợp lệ.
      if (values.expiresAtDate < values.startsAtDate)
        fail("expiresAtDate", "Ngày kết thúc phải cùng hoặc sau ngày bắt đầu.")
      else if (mode === "create" && values.expiresAtDate < today)
        fail("expiresAtDate", "Ngày kết thúc không được ở quá khứ.")
    }
  })
}
