import { flexRender, useTable } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SortOrder } from "@/types/api"
import { SORTABLE_COLUMNS } from "../constants"
import type { Voucher, VoucherSortBy } from "../types"
import { buildVoucherColumns, voucherTableFeatures } from "./voucher-columns"

function VouchersTable({
  vouchers,
  sortBy,
  order,
  togglingId,
  onSort,
  onEdit,
  onToggle,
}: {
  vouchers: Voucher[]
  sortBy: VoucherSortBy
  order: SortOrder
  /** id voucher đang chờ phản hồi bật/tắt. */
  togglingId: number | undefined
  onSort: (column: VoucherSortBy) => void
  onEdit: (voucher: Voucher) => void
  onToggle: (voucher: Voucher, isActive: boolean) => void
}) {
  const table = useTable({
    features: voucherTableFeatures,
    data: vouchers,
    columns: buildVoucherColumns({ togglingId, onEdit, onToggle }),
    getRowId: (voucher) => String(voucher.id),
    manualSorting: true,
    state: { sorting: [{ id: sortBy, desc: order === "desc" }] },
  })

  return (
    <Table className="min-w-5xl">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const id = header.column.id as VoucherSortBy
              const sortable = SORTABLE_COLUMNS.includes(id)
              const sorted = sortable ? header.column.getIsSorted() : false
              const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(id)}
                      className="-mx-1 inline-flex items-center gap-1 rounded-xs px-1 text-inherit outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <Icon className={sorted ? "size-3 text-ink" : "size-3"} aria-hidden="true" />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { VouchersTable }
