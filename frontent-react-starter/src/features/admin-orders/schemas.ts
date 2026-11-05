import { z } from "zod"
import { REASON_MAX_LENGTH } from "./constants"

/** Phản chiếu `UpdateOrderStatusDto.reason` khi hủy đơn: bắt buộc, tối đa 500 ký tự (backend vẫn kiểm lại). */
export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập lý do hủy đơn")
    .max(REASON_MAX_LENGTH, `Lý do không được vượt quá ${REASON_MAX_LENGTH} ký tự`),
})

export type CancelOrderValues = z.infer<typeof cancelOrderSchema>
