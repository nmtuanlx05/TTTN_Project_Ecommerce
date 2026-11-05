import type { UseFormReturn } from "react-hook-form"
import type { VoucherFormValues } from "../schemas"

/** Props chung của các nhóm ô trong form voucher. `usedCount > 0` nghĩa là các ô giá trị bị khóa. */
export interface VoucherFieldsProps {
  form: UseFormReturn<VoucherFormValues>
  /** Tiền tố id để gắn nhãn với ô nhập (một trang có thể mở nhiều form). */
  id: string
  usedCount: number
}

export function lockedNote(usedCount: number): string {
  return `Không đổi được vì voucher đã được dùng ${usedCount} lần.`
}
