import {
  flexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SortOrder } from "@/types/api"
import { PAGE_SIZE } from "../constants"
import type { Category, CategorySortBy } from "../types"

// Sắp xếp và phân trang do backend làm, bảng chỉ hiển thị nên không khai báo
// row model nào; rowSortingFeature chỉ để biết cột nào đang sắp (aria-sort).
const features = tableFeatures({ rowSortingFeature })
type Features = typeof features

const NOT_SET = <span className="text-ink-muted">—</span>

/** Cột duy nhất bấm để sắp xếp được (backend còn nhận `id` nhưng đó là thứ tự mặc định). */
const SORTABLE_COLUMN: CategorySortBy = "name"

function CategoriesTable({
  categories,
  sortBy,
  order,
  canManage,
  onSort,
  onEdit,
  onDelete,
}: {
  categories: Category[]
  sortBy: CategorySortBy
  order: SortOrder
  /** ADMIN: có nút Xóa. STAFF chỉ được sửa nên nút Xóa không hiện. */
  canManage: boolean
  onSort: (column: CategorySortBy) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  const columns: ColumnDef<Features, Category>[] = [
    {
      id: "name",
      header: "Tên",
      cell: ({ row }) => <span className="font-medium text-ink">{row.original.name}</span>,
    },
    {
      id: "slug",
      header: "Slug",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono whitespace-nowrap text-ink-muted">{row.original.slug}</span>
      ),
    },
    {
      id: "parent",
      header: "Danh mục cha",
      enableSorting: false,
      cell: ({ row }) => row.original.parent?.name ?? NOT_SET,
    },
    {
      id: "productCount",
      header: "Sản phẩm",
      enableSorting: false,
      cell: ({ row }) => <span data-numeric>{row.original.productCount}</span>,
    },
    {
      id: "childCount",
      header: "Danh mục con",
      enableSorting: false,
      cell: ({ row }) => <span data-numeric>{row.original.childCount}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Hành động</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const category = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Sửa danh mục ${category.name}`}
              title="Sửa danh mục"
              onClick={() => onEdit(category)}
            >
              <Pencil />
            </Button>
            {canManage ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Xóa danh mục ${category.name}`}
                title="Xóa danh mục"
                onClick={() => onDelete(category)}
              >
                <Trash2 />
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  const table = useTable({
    features,
    data: categories,
    columns,
    getRowId: (category) => String(category.id),
    manualSorting: true,
    state: { sorting: [{ id: sortBy, desc: order === "desc" }] },
  })

  return (
    <Table className="min-w-3xl">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const sortable = header.column.id === SORTABLE_COLUMN
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
                      onClick={() => onSort(SORTABLE_COLUMN)}
                      className="-mx-1 inline-flex items-center gap-1 rounded-xs px-1 text-inherit outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <Icon
                        className={sorted ? "size-3 text-ink" : "size-3"}
                        aria-hidden="true"
                      />
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

/** Khung bảng lúc tải lần đầu: giữ đúng số cột và chiều cao dòng để không giật. */
function CategoriesTableSkeleton() {
  const widths = ["w-36", "w-32", "w-28", "w-10", "w-10", "w-16"]
  return (
    <Table className="min-w-3xl" aria-busy="true">
      <TableHeader>
        <TableRow>
          {["Tên", "Slug", "Danh mục cha", "Sản phẩm", "Danh mục con", ""].map((label, index) => (
            <TableHead key={index}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: PAGE_SIZE }, (_, row) => (
          <TableRow key={row}>
            {widths.map((width, cell) => (
              <TableCell key={cell}>
                <Skeleton className={`h-4 ${width}`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { CategoriesTable, CategoriesTableSkeleton }
