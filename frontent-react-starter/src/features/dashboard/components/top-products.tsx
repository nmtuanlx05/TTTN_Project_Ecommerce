import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { PackageSearch } from "lucide-react"
import { formatNumber, formatVnd } from "@/lib/format"
import type { TopProduct } from "../mock"

function TopProducts({ products }: { products: TopProduct[] }) {
  return (
    <section
      aria-labelledby="top-products-title"
      className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card"
    >
      <div>
        <h2 id="top-products-title" className="font-display text-h3 text-ink">
          Top 5 bán chạy
        </h2>
        <p className="mt-0.5 text-caption text-ink-muted">
          Xếp theo doanh thu trong kỳ
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Chưa bán được sản phẩm nào trong kỳ"
          description="Thử chọn khoảng thời gian rộng hơn."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Đã bán</TableHead>
              <TableHead className="text-right">Doanh thu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <span className="block text-ink">{product.name}</span>
                  <span data-numeric className="block text-caption text-ink-muted">
                    {product.sku}
                  </span>
                </TableCell>
                <TableCell data-numeric className="text-right">
                  {formatNumber(product.quantitySold)}
                </TableCell>
                <TableCell data-numeric className="text-right">
                  {formatVnd(product.revenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

function TopProductsSkeleton() {
  return (
    <div className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-56 w-full" />
    </div>
  )
}

export { TopProducts, TopProductsSkeleton }
