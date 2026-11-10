import { Badge } from "@/components/ui/badge"
import { REASON_LABEL } from "../constants"
import type { ReviewReason } from "../types"

/** Lý do giao dịch cần xem lại bằng tiếng Việt (`null`: giao dịch bình thường, không có lý do). */
function ReasonBadge({ reason }: { reason: ReviewReason | null }) {
  if (!reason) return <span className="text-body-sm text-ink-muted">—</span>
  return <Badge variant="outline">{REASON_LABEL[reason]}</Badge>
}

export { ReasonBadge }
