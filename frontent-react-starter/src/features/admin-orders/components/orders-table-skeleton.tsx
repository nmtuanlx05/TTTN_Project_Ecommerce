import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PAGE_SIZE } from "../constants"

const COLUMNS = ["Mã đơn", "Khách hàng", "Ngày đặt", "Số sản phẩm", "Tổng tiền", "Thanh toán", "Trạng thái", ""]
const WIDTHS = ["w-28", "w-32", "w-28", "w-8", "w-20", "w-20", "w-24", "w-20"]

/** Khung bảng lúc tải lần đầu: giữ đúng số cột để không giật. */
function OrdersTableSkeleton() {
  return (
    <Table className="min-w-5xl" aria-busy="true">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((label, index) => (
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

export { OrdersTableSkeleton }
