import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PAGE_SIZE } from "../constants"

const COLUMNS = [
  { label: "Sản phẩm", width: "w-44" },
  { label: "Biến thể", width: "w-20" },
  { label: "SKU", width: "w-24" },
  { label: "Tồn kho", width: "w-12" },
  { label: "Đang giữ", width: "w-12" },
  { label: "Khả dụng", width: "w-12" },
  { label: "Ngưỡng cảnh báo", width: "w-12" },
  { label: "Trạng thái", width: "w-20" },
  { label: "", width: "w-40" },
]

/** Khung bảng lúc tải lần đầu: giữ đúng số cột để không giật. */
function InventoryTableSkeleton() {
  return (
    <Table className="min-w-6xl" aria-busy="true">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column, index) => (
            <TableHead key={index}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: PAGE_SIZE }, (_, row) => (
          <TableRow key={row}>
            {COLUMNS.map((column, cell) => (
              <TableCell key={cell}>
                <Skeleton className={`h-4 ${column.width}`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { InventoryTableSkeleton }
