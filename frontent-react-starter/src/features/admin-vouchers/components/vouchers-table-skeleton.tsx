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

const HEADERS = ["Mã", "Ưu đãi", "Đơn tối thiểu", "Thời gian áp dụng", "Lượt dùng", "Trạng thái", "Bật/tắt", ""]
const WIDTHS = ["w-28", "w-36", "w-24", "w-44", "w-16", "w-24", "w-9", "w-8"]

/** Khung bảng lúc tải lần đầu: giữ đúng số cột và chiều cao dòng để không giật. */
function VouchersTableSkeleton() {
  return (
    <Table className="min-w-5xl" aria-busy="true">
      <TableHeader>
        <TableRow>
          {HEADERS.map((label, index) => (
            <TableHead key={index}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: PAGE_SIZE }, (_, row) => (
          <TableRow key={row}>
            {WIDTHS.map((width, cell) => (
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

export { VouchersTableSkeleton }
