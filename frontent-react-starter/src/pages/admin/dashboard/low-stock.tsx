import { Link } from "react-router-dom"
import { PackageCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import type { LowStockVariant } from "@/lib/mock/dashboard"

/**
 * Tồn khả dụng = stock − reserved. Khả dụng = 0 nhưng stock > 0 là trường hợp
 * đáng chú ý nhất: còn hàng trong kho nhưng đã bị đơn chưa xuất giữ hết, nên
 * không bán thêm được — khác hẳn với hết hàng thật.
 */
function LowStock({ variants }: { variants: LowStockVariant[] }) {
  return (
    <section
      aria-labelledby="low-stock-title"
      className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card"
    >
      <div className="flex items-start justify-between gap-inline">
        <div>
          <h2 id="low-stock-title" className="font-display text-h3 text-ink">
            Sắp hết hàng
          </h2>
          <p className="mt-0.5 text-caption text-ink-muted">
            Tồn khả dụng = tồn kho − đang giữ
          </p>
        </div>
        <Button variant="ghost" size="sm" render={<Link to="/admin/inventory" />}>
          Vào kho
        </Button>
      </div>

      {variants.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Không có biến thể nào dưới ngưỡng"
          description="Tồn kho đang đủ cho tất cả size và màu."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {variants.map((variant) => {
            const soldOut = variant.available === 0
            return (
              <li
                key={variant.id}
                className="flex flex-wrap items-center justify-between gap-inline py-row"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm text-ink">
                    {variant.productName}
                  </p>
                  <p className="text-caption text-ink-muted">
                    Size {variant.size} · {variant.color} ·{" "}
                    <span data-numeric>{variant.sku}</span>
                  </p>
                </div>

                <div className="flex items-center gap-inline">
                  <dl className="flex items-center gap-3 text-caption">
                    <div className="text-right">
                      <dt className="text-ink-muted">Tồn</dt>
                      <dd data-numeric className="text-ink">
                        {formatNumber(variant.stock)}
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-ink-muted">Giữ</dt>
                      <dd data-numeric className="text-ink">
                        {formatNumber(variant.reserved)}
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-ink-muted">Khả dụng</dt>
                      <dd
                        data-numeric
                        className={cn(
                          "font-semibold",
                          soldOut ? "text-danger-fg" : "text-ink",
                        )}
                      >
                        {formatNumber(variant.available)}
                      </dd>
                    </div>
                  </dl>
                  {soldOut ? (
                    <Badge variant="returned">Hết khả dụng</Badge>
                  ) : (
                    <Badge variant="outline">Dưới ngưỡng</Badge>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function LowStockSkeleton() {
  return (
    <div className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <Skeleton className="h-5 w-36" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}

export { LowStock, LowStockSkeleton }
