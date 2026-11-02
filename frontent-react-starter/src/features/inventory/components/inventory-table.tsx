import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatNumber } from "@/lib/format"
import type { SortOrder } from "@/types/api"
import type { InventoryDialogKind } from "../use-inventory-dialog"
import type { InventoryItem, InventorySortBy } from "../types"
import { InventoryProductCell } from "./inventory-product-cell"
import { InventoryRowActions } from "./inventory-row-actions"
import { InventorySortHeader } from "./inventory-sort-header"
import { MinStockCell } from "./min-stock-cell"
import { StockStatusBadge } from "./stock-status-badge"

type Column = {
  id: string
  label: string
  /** Có = cột sắp xếp được phía server (chỉ `name`, `stock`, `available`). */
  sortBy?: InventorySortBy
  numeric?: boolean
}

const COLUMNS: Column[] = [
  { id: "product", label: "Sản phẩm", sortBy: "name" },
  { id: "variant", label: "Biến thể" },
  { id: "sku", label: "SKU" },
  { id: "stock", label: "Tồn kho", sortBy: "stock", numeric: true },
  { id: "reserved", label: "Đang giữ", numeric: true },
  { id: "available", label: "Khả dụng", sortBy: "available", numeric: true },
  { id: "minStock", label: "Ngưỡng cảnh báo", numeric: true },
  { id: "status", label: "Trạng thái" },
  { id: "actions", label: "Thao tác" },
]

function InventoryTable({
  items,
  sortBy,
  order,
  onSort,
  onOpenDialog,
}: {
  items: InventoryItem[]
  sortBy: InventorySortBy
  order: SortOrder
  onSort: (column: InventorySortBy) => void
  onOpenDialog: (kind: InventoryDialogKind, item: InventoryItem, trigger: HTMLElement | null) => void
}) {
  return (
    <Table className="min-w-6xl">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => {
            const sorted = column.sortBy === sortBy ? order : false
            return (
              <TableHead
                key={column.id}
                className={column.numeric ? "text-right" : undefined}
                aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
              >
                {column.sortBy ? (
                  <InventorySortHeader
                    label={column.label}
                    sorted={sorted}
                    alignEnd={column.numeric}
                    onClick={() => onSort(column.sortBy as InventorySortBy)}
                  />
                ) : column.id === "actions" ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <InventoryProductCell item={item} />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {item.size} · {item.color}
            </TableCell>
            <TableCell>
              <span className="font-mono whitespace-nowrap">{item.sku}</span>
            </TableCell>
            <TableCell className="text-right" data-numeric>
              {formatNumber(item.stock)}
            </TableCell>
            <TableCell className="text-right text-ink-muted" data-numeric>
              {formatNumber(item.reserved)}
            </TableCell>
            <TableCell className="text-right font-semibold text-ink" data-numeric>
              {formatNumber(item.available)}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              <MinStockCell minStock={item.minStock} />
            </TableCell>
            <TableCell>
              <StockStatusBadge status={item.stockStatus} />
            </TableCell>
            <TableCell>
              <InventoryRowActions item={item} onOpen={onOpenDialog} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { InventoryTable }
