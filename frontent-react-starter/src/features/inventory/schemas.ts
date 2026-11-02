import { z } from "zod"
import {
  EXPORT_REASONS,
  MAX_QUANTITY_PER_OPERATION,
  MAX_STOCK,
  NOTE_MAX_LENGTH,
  OTHER_NOTE_REQUIRED_MESSAGE,
  REASON_MAX_LENGTH,
} from "./constants"
import { parseQuantityInput } from "./quantity-input"
import type {
  AdjustStockInput,
  ExportReason,
  ExportStockInput,
  ImportStockInput,
} from "./types"

/**
 * Quy tắc phản chiếu DTO của backend (docs/api/inventory.md). Số trong form là chuỗi (ô chỉ nhận chữ
 * số) và chỉ được ép sang số nguyên lúc gửi. Backend vẫn kiểm tra lại ở server.
 */
function integerText(rules: { empty: string; min: number; max: number; maxLabel: string }) {
  return z
    .string()
    .trim()
    .min(1, rules.empty)
    .superRefine((value, ctx) => {
      if (value === "") return
      const parsed = parseQuantityInput(value)
      if (parsed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Chỉ nhập chữ số, là số nguyên không âm, ví dụ 50.",
        })
      } else if (parsed < rules.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Giá trị tối thiểu là ${rules.min}.`,
        })
      } else if (parsed > rules.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tối đa ${rules.maxLabel}. Kiểm tra lại số vừa nhập.`,
        })
      }
    })
}

const quantity = integerText({
  empty: "Nhập số lượng, ví dụ 50.",
  min: 1,
  max: MAX_QUANTITY_PER_OPERATION,
  maxLabel: "100.000 mỗi lần",
})

const note = z
  .string()
  .trim()
  .max(NOTE_MAX_LENGTH, `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự. Rút gọn lại.`)

export const importSchema = z.object({ quantity, note })
export type ImportFormValues = z.infer<typeof importSchema>

export const exportSchema = z
  .object({
    quantity,
    /** Chuỗi rỗng = chưa chọn; `toExportInput` mới thu hẹp về `ExportReason`. */
    reason: z
      .string()
      // `: boolean` để TS không suy ra type predicate, nếu không kiểu form bị thu hẹp về `ExportReason`
      // và giá trị ban đầu "" (chưa chọn) không hợp lệ.
      .refine((value): boolean => isExportReason(value), { message: "Chọn lý do xuất kho." }),
    note,
  })
  .superRefine((values, ctx) => {
    if (values.reason === "OTHER" && values.note === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: OTHER_NOTE_REQUIRED_MESSAGE,
      })
    }
  })
export type ExportFormValues = z.infer<typeof exportSchema>

export const adjustSchema = z.object({
  newStock: integerText({
    empty: "Nhập số lượng đếm thực tế, ví dụ 14.",
    min: 0,
    max: MAX_STOCK,
    maxLabel: "2.147.483.647",
  }),
  reason: z
    .string()
    .trim()
    .min(1, "Nhập lý do điều chỉnh, ví dụ Kiểm kê cuối tháng.")
    .max(REASON_MAX_LENGTH, `Lý do tối đa ${REASON_MAX_LENGTH} ký tự. Rút gọn lại.`),
  note,
})
export type AdjustFormValues = z.infer<typeof adjustSchema>

export const minStockSchema = z.object({
  minStock: integerText({
    empty: "Nhập ngưỡng cảnh báo, ví dụ 5 (0 = không cảnh báo).",
    min: 0,
    max: MAX_STOCK,
    maxLabel: "2.147.483.647",
  }),
})
export type MinStockFormValues = z.infer<typeof minStockSchema>

export function isExportReason(value: string): value is ExportReason {
  return EXPORT_REASONS.some((reason) => reason === value)
}

/** Ghi chú bỏ trống thì không gửi. Các hàm dưới đây chỉ gọi sau khi form đã qua schema. */
function optionalNote(value: string): { note?: string } {
  return value === "" ? {} : { note: value }
}

export function toImportInput(values: ImportFormValues): ImportStockInput {
  return { quantity: Number(values.quantity), ...optionalNote(values.note) }
}

/** `reason` đã qua schema nên luôn là mã hợp lệ; trả `null` chỉ để TypeScript thu hẹp kiểu. */
export function toExportInput(values: ExportFormValues): ExportStockInput | null {
  if (!isExportReason(values.reason)) return null
  return {
    quantity: Number(values.quantity),
    reason: values.reason,
    ...optionalNote(values.note),
  }
}

export function toAdjustInput(values: AdjustFormValues): AdjustStockInput {
  return {
    newStock: Number(values.newStock),
    reason: values.reason,
    ...optionalNote(values.note),
  }
}
