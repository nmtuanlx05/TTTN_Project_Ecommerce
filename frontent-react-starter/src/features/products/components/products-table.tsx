import {
  flexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime, formatVnd } from "@/lib/format"
import type { SortOrder } from "@/types/api"
import type { ProductListItem, ProductSortBy } from "../types"
import { ProductRowActions } from "./product-row-actions"
import { ProductNameCell } from "./product-name-cell"
import { ProductSortHeader } from "./product-sort-header"
import { ProductThumb } from "./product-thumb"
import { ProductVariantsCell } from "./product-variants-cell"
import { ProductVisibility } from "./product-visibility"

// Sắp xếp và phân trang do backend làm, bảng chỉ hiển thị nên không khai báo row model nào;
// rowSortingFeature chỉ để biết cột nào đang sắp (aria-sort).
const features = tableFeatures({ rowSortingFeature })
type Features = typeof features

const SORTABLE: readonly string[] = ["name", "price", "createdAt"] satisfies ProductSortBy[]
const SORT_LABEL: Record<ProductSortBy, string> = {
  name: "Sản phẩm",
  price: "Giá",
  createdAt: "Ngày tạo",
}

function ProductsTable({
  products,
  sortBy,
  order,
  pendingId,
  onSort,
  onToggleStatus,
}: {
  products: ProductListItem[]
  sortBy: ProductSortBy
  order: SortOrder
  pendingId: number | undefined
  onSort: (column: ProductSortBy) => void
  onToggleStatus: (product: ProductListItem) => void
}) {
  const columns: ColumnDef<Features, ProductListItem>[] = [
    {
      id: "image",
      header: () => <span className="sr-only">Ảnh</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <ProductThumb src={row.original.imageUrl} alt={row.original.name} className="w-9" />
      ),
    },
    {
      id: "name",
      header: "Sản phẩm",
      cell: ({ row }) => <ProductNameCell product={row.original} />,
    },
    {
      id: "category",
      header: "Danh mục",
      enableSorting: false,
      cell: ({ row }) => row.original.category.name,
    },
    {
      id: "price",
      header: "Giá",
      cell: ({ row }) => (
        <span data-numeric className="whitespace-nowrap">
          {formatVnd(row.original.price)}
        </span>
      ),
    },
    {
      id: "variants",
      header: "Biến thể",
      enableSorting: false,
      cell: ({ row }) => (
        <ProductVariantsCell
          active={row.original.activeVariantCount}
          total={row.original.variantCount}
        />
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      enableSorting: false,
      cell: ({ row }) => <ProductVisibility isActive={row.original.isActive} />,
    },
    {
      id: "createdAt",
      header: "Ngày tạo",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-ink-muted">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Hành động</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <ProductRowActions
          product={row.original}
          pending={pendingId === row.original.id}
          onToggle={onToggleStatus}
        />
      ),
    },
  ]

  const table = useTable({
    features,
    data: products,
    columns,
    getRowId: (product) => String(product.id),
    manualSorting: true,
    state: { sorting: [{ id: sortBy, desc: order === "desc" }] },
  })

  return (
    <Table className="min-w-5xl">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const id = header.column.id
              const sortable = SORTABLE.includes(id)
              const sorted = sortable ? header.column.getIsSorted() : false
              return (
                <TableHead
                  key={header.id}
                  className={id === "price" ? "text-right" : undefined}
                  aria-sort={
                    sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                  }
                >
                  {sortable ? (
                    <ProductSortHeader
                      label={SORT_LABEL[id as ProductSortBy]}
                      sorted={sorted}
                      alignEnd={id === "price"}
                      onClick={() => onSort(id as ProductSortBy)}
                    />
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
              <TableCell
                key={cell.id}
                className={cell.column.id === "price" ? "text-right" : undefined}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { ProductsTable }
