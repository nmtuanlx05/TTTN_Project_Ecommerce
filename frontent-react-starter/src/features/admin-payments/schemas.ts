import { z } from "zod"
import { NOTE_MAX_LENGTH } from "./constants"

/** Ghi chú bắt buộc (mã giao dịch ngân hàng, cách xử lý...) cho cả xác nhận thanh toán lẫn đánh dấu đã xử lý. Backend vẫn kiểm lại. */
export const paymentNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập ghi chú")
    .max(NOTE_MAX_LENGTH, `Ghi chú không được vượt quá ${NOTE_MAX_LENGTH} ký tự`),
})

export type PaymentNoteValues = z.infer<typeof paymentNoteSchema>
