import { ImagePreview } from "@/components/shared/image-preview"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatNumber, formatVnd } from "@/lib/format"
import type { AdminOrder } from "../types"

/** Dòng hàng là bản chụp lúc đặt (tên, SKU, màu, size, giá) nên không đổi khi sản phẩm bị sửa sau này. */
function OrderItemsTable({ items }: { items: AdminOrder["items"] }) {
  return (
    <section aria-labelledby="order-items" className="flex flex-col gap-stack">
      <h2 id="order-items" className="font-display text-h3 text-ink">
        Sản phẩm trong đơn
      </h2>
      <Table className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="sr-only">Ảnh</span>
            </TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Màu · Size</TableHead>
            <TableHead className="text-right">Số lượng</TableHead>
            <TableHead className="text-right">Đơn giá</TableHead>
            <TableHead className="text-right">Thành tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.sku}>
              <TableCell>
                <ImagePreview src={item.imageUrl} alt={item.productName} shape="portrait" zoomable className="w-9" />
              </TableCell>
              <TableCell className="font-medium text-ink">{item.productName}</TableCell>
              <TableCell data-numeric className="whitespace-nowrap text-ink-muted">
                {item.sku}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {item.color} · {item.size}
              </TableCell>
              <TableCell data-numeric className="text-right">
                {formatNumber(item.quantity)}
              </TableCell>
              <TableCell data-numeric className="text-right whitespace-nowrap">
                {formatVnd(item.price)}
              </TableCell>
              <TableCell data-numeric className="text-right whitespace-nowrap">
                {formatVnd(item.lineTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

export { OrderItemsTable }
