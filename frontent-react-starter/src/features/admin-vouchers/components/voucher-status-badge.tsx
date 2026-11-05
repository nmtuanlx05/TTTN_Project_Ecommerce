import { Badge } from "@/components/ui/badge"
import { STATUS_BADGE, STATUS_LABEL } from "../constants"
import type { VoucherStatus } from "../types"

/** Badge trạng thái SUY RA (ACTIVE/INACTIVE/SCHEDULED/EXPIRED/EXHAUSTED); khác với công tắc, vốn chỉ phản ánh `isActive`. */
function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  return <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
}

export { VoucherStatusBadge }
