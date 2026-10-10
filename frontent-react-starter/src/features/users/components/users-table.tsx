import {
  flexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Lock, LockOpen, Pencil } from "lucide-react"
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
import { formatDateTime } from "@/lib/format"
import type { SortOrder } from "@/types/api"
import type { User, UserSortBy } from "../types"
import { PAGE_SIZE, SORTABLE_COLUMNS } from "../constants"
import { displayName } from "../display-name"
import { RoleBadge } from "./role-badge"
import { UserStatus } from "./user-status"

// Sắp xếp và phân trang do backend làm, bảng chỉ hiển thị nên không khai báo
// row model nào; rowSortingFeature chỉ để biết cột nào đang sắp (aria-sort).
const features = tableFeatures({ rowSortingFeature })
type Features = typeof features

const NOT_SET = <span className="text-ink-muted">—</span>

function UsersTable({
  users,
  sortBy,
  order,
  togglingId,
  onSort,
  onEdit,
  onToggleStatus,
}: {
  users: User[]
  sortBy: UserSortBy
  order: SortOrder
  /** id user đang chờ phản hồi khóa/mở khóa. */
  togglingId: number | undefined
  onSort: (column: UserSortBy) => void
  onEdit: (user: User) => void
  onToggleStatus: (user: User) => void
}) {
  const columns: ColumnDef<Features, User>[] = [
    {
      id: "name",
      header: "Họ tên",
      cell: ({ row }) =>
        row.original.name ?? <span className="text-ink-muted">Chưa có tên</span>,
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.email}</span>,
    },
    {
      id: "phone",
      header: "Số điện thoại",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.phone ? (
          <span data-numeric className="whitespace-nowrap">
            {row.original.phone}
          </span>
        ) : (
          NOT_SET
        ),
    },
    {
      id: "role",
      header: "Vai trò",
      enableSorting: false,
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      id: "isActive",
      header: "Trạng thái",
      enableSorting: false,
      cell: ({ row }) => <UserStatus isActive={row.original.isActive} />,
    },
    {
      id: "createdAt",
      header: "Ngày tạo",
      cell: ({ row }) => (
        <span data-numeric className="whitespace-nowrap text-ink-muted">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Hành động</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original
        const locking = user.isActive
        const busy = togglingId === user.id
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Sửa ${displayName(user)}`}
              title="Sửa người dùng"
              onClick={() => onEdit(user)}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              loading={busy}
              disabled={togglingId !== undefined && !busy}
              aria-label={`${locking ? "Khóa" : "Mở khóa"} tài khoản ${displayName(user)}`}
              title={locking ? "Khóa tài khoản" : "Mở khóa tài khoản"}
              onClick={() => onToggleStatus(user)}
            >
              {locking ? <Lock /> : <LockOpen />}
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useTable({
    features,
    data: users,
    columns,
    getRowId: (user) => String(user.id),
    manualSorting: true,
    state: { sorting: [{ id: sortBy, desc: order === "desc" }] },
  })

  return (
    <Table className="min-w-4xl">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const id = header.column.id as UserSortBy
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
function UsersTableSkeleton() {
  const widths = ["w-32", "w-44", "w-24", "w-20", "w-20", "w-28", "w-16"]
  return (
    <Table className="min-w-4xl" aria-busy="true">
      <TableHeader>
        <TableRow>
          {["Họ tên", "Email", "Số điện thoại", "Vai trò", "Trạng thái", "Ngày tạo", ""].map(
            (label, index) => (
              <TableHead key={index}>{label}</TableHead>
            ),
          )}
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

export { UsersTable, UsersTableSkeleton }
