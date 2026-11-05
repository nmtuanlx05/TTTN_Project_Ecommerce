import { Skeleton } from "@/components/ui/skeleton"

function OrderDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-section">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export { OrderDetailSkeleton }
