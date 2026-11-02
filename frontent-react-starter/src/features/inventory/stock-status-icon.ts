import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"
import type { StockStatus } from "./types"

/** Icon theo trạng thái tồn: cùng với nhãn chữ để không phân biệt chỉ bằng màu. */
export const STOCK_STATUS_ICON: Record<StockStatus, typeof CircleCheck> = {
  in_stock: CircleCheck,
  low: TriangleAlert,
  out: CircleAlert,
}
