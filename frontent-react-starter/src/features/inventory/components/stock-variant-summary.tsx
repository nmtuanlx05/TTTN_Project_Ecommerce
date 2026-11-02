import { formatNumber } from "@/lib/format"
import type { InventoryItem } from "../types"

/** Đầu mọi hộp thoại kho: sản phẩm, biến thể, SKU và các con số hiện tại (lấy từ dòng mới nhất). */
function StockVariantSummary({ item }: { item: InventoryItem }) {
  const figures = [
    { label: "Tồn kho", value: formatNumber(item.stock) },
    { label: "Đang giữ", value: formatNumber(item.reserved) },
    { label: "Khả dụng", value: formatNumber(item.available) },
    { label: "Ngưỡng", value: item.minStock > 0 ? formatNumber(item.minStock) : "Chưa đặt" },
  ]
  return (
    <div className="flex flex-col gap-stack rounded-md border border-border-subtle p-card">
      <div className="min-w-0">
        <p className="font-medium text-ink">{item.product.name}</p>
        <p className="text-body-sm text-ink-muted">
          {item.size} · {item.color} ·{" "}
          <span className="font-mono" data-numeric>
            {item.sku}
          </span>
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-inline sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="flex flex-col">
            <dt className="text-caption text-ink-muted">{figure.label}</dt>
            <dd className="text-body-sm font-semibold text-ink" data-numeric>
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export { StockVariantSummary }
