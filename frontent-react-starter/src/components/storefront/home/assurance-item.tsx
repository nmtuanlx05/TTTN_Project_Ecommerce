import { Headset, ShieldCheck, Truck, Undo2, type LucideIcon } from "lucide-react"
import type { AssuranceIcon, HomeAssurance } from "@/lib/home-content"

/** Bảng icon dùng chung (cả dòng cam kết ở trang chi tiết sản phẩm). */
const ICONS: Record<AssuranceIcon, LucideIcon> = {
  truck: Truck,
  return: Undo2,
  headset: Headset,
  shield: ShieldCheck,
}

/** Một ô cam kết: biểu tượng (trang trí), tiêu đề, mô tả. */
function AssuranceItem({ item }: { item: HomeAssurance }) {
  const Icon = ICONS[item.icon]
  return (
    <li className="flex flex-col gap-2">
      <Icon aria-hidden="true" className="size-7 text-ink" strokeWidth={1.5} />
      <p className="text-body font-semibold text-ink">{item.title}</p>
      <p className="text-body-sm text-ink-muted">{item.description}</p>
    </li>
  )
}

export { AssuranceItem, ICONS as ASSURANCE_ICONS }
