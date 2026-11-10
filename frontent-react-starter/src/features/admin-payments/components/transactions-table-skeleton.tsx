import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PAGE_SIZE, TRANSACTION_HEADERS } from "../constants"

const WIDTHS = ["w-28", "w-20", "w-32", "w-40", "w-28", "w-36"]

/** Khung bảng lúc tải lần đầu: đúng số cột để không giật. */
function TransactionsTableSkeleton() {
  return (
    <Table className="min-w-5xl" aria-busy="true">
      <TableHeader>
        <TableRow>
          {TRANSACTION_HEADERS.map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: PAGE_SIZE / 2 }, (_, row) => (
          <TableRow key={row}>
            {WIDTHS.map((width, cell) => (
              <TableCell key={cell}>
                <Skeleton className={`h-5 ${width}`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { TransactionsTableSkeleton }
