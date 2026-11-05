import { ProductImage } from "@/components/storefront/product-image"
import { formatVnd } from "@/lib/format"
import type { PreviewItem } from "../types"

/** Một dòng hàng trong tóm tắt: ảnh có huy hiệu số lượng, tên, "Màu · Size", thành tiền (giá do backend tính). */
function SummaryLine({ item }: { item: PreviewItem }) {
  return (
    <li className="flex items-start gap-3">
      <div className="relative w-12 shrink-0">
        <ProductImage src={item.imageUrl} alt="" className="w-12" />
        <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-4xl bg-primary px-1 text-caption font-semibold text-primary-fg">
          {item.quantity}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 text-body-sm font-medium text-ink">{item.name}</p>
        <p className="text-caption text-ink-muted">
          {item.color} · {item.size}
        </p>
      </div>
      <span className="shrink-0 text-body-sm font-semibold text-ink">{formatVnd(item.lineTotal)}</span>
    </li>
  )
}

export { SummaryLine }
