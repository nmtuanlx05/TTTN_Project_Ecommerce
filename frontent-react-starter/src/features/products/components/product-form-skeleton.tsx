import { Skeleton } from "@/components/ui/skeleton"

/** Khung trang sửa lúc tải chi tiết: ba khối giống form thật. */
function ProductFormSkeleton() {
  return (
    <div className="flex flex-col gap-section" aria-busy="true">
      {["h-56", "h-28", "h-40"].map((height) => (
        <div
          key={height}
          className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card"
        >
          <Skeleton className="h-6 w-48" />
          <Skeleton className={`${height} w-full`} />
        </div>
      ))}
    </div>
  )
}

export { ProductFormSkeleton }
