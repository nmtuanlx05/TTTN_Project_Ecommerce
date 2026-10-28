import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PAGE_SIZE } from "../constants"

const COLUMNS = [
  { label: "Ảnh", width: "w-9" },
  { label: "Sản phẩm", width: "w-44" },
  { label: "Danh mục", width: "w-24" },
  { label: "Giá", width: "w-20" },
  { label: "Biến thể", width: "w-20" },
  { label: "Trạng thái", width: "w-20" },
  { label: "Ngày tạo", width: "w-24" },
  { label: "", width: "w-16" },
]

/** Khung bảng lúc tải lần đầu: giữ đúng số cột và chiều cao dòng để không giật. */
function ProductsTableSkeleton() {
  return (
    <Table className="min-w-5xl" aria-busy="true">
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
                <Skeleton className={cell === 0 ? "aspect-[3/4] w-9" : `h-4 ${column.width}`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { ProductsTableSkeleton }
