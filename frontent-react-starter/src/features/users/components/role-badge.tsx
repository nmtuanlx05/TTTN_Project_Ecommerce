import { Badge } from "@/components/ui/badge"
import type { Role } from "../types"
import { ROLE_LABEL } from "../constants"

// Quyền càng cao, mực càng đậm: cùng logic với badge trạng thái đơn hàng.
const VARIANT = {
  ADMIN: "solid",
  STAFF: "neutral",
  CUSTOMER: "outline",
} as const

function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={VARIANT[role]}>{ROLE_LABEL[role]}</Badge>
}

export { RoleBadge }
