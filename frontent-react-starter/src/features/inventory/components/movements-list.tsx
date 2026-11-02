import { RotateCw } from "lucide-react"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import { useMovements } from "../queries"
import { MovementItem } from "./movement-item"

/**
 * Lịch sử đổi tồn của một biến thể, mới nhất trước, "Tải thêm" theo trang. Chỉ mount khi hộp thoại mở nên
 * không gọi API khi chưa xem. Khóa truy vấn nằm dưới `["inventory"]` nên tự làm mới sau mỗi thao tác.
 */
function MovementsList({ variantId }: { variantId: number }) {
  const { data, error, isPending, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useMovements(variantId)

  if (isPending) {
    return (
      <div className="flex flex-col gap-stack" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (isError && !data) {
    return (
      <Alert variant="danger" title="Không tải được lịch sử">
        <p>{error.message}</p>
        <Button variant="secondary" size="sm" className="mt-2" loading={isFetching} onClick={() => refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </Alert>
    )
  }

  const movements = data.pages.flatMap((page) => page.items)
  const total = data.pages[0]?.meta.total ?? 0

  if (movements.length === 0) {
    return <p className="py-stack text-center text-body-sm text-ink-muted">Biến thể này chưa có lần đổi tồn nào.</p>
  }

  return (
    <div className="flex flex-col gap-stack">
      <ul>
        {movements.map((movement) => (
          <MovementItem key={movement.id} movement={movement} />
        ))}
      </ul>
      {isError ? (
        <Alert variant="warning">Chưa tải thêm được. {error.message}</Alert>
      ) : null}
      <div className="flex flex-col items-center gap-1">
        <p className="text-caption text-ink-muted" aria-live="polite">
          Đã hiện <span data-numeric>{formatNumber(movements.length)}</span> trên{" "}
          <span data-numeric>{formatNumber(total)}</span> lần đổi tồn
        </p>
        {hasNextPage ? (
          <Button variant="secondary" size="sm" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
            Tải thêm
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { MovementsList }
