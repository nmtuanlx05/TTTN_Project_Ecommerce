import { STRIP_CARD_WIDTH } from "../../home-constants"
import { cn } from "@/lib/utils"

/** Skeleton của danh sách cuộn ngang: cùng chiều rộng thẻ và tỉ lệ 3:4 với thẻ thật nên bố cục không nhảy khi dữ liệu về. */
function ProductStripSkeleton({ count }: { count: number }) {
  return (
    <ul aria-hidden="true" className="flex gap-4 overflow-hidden pb-4 md:gap-6">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={cn("flex shrink-0 flex-col gap-3", STRIP_CARD_WIDTH)}>
          <div className="shimmer aspect-[3/4] rounded-card" />
          <div className="flex flex-col gap-2">
            <div className="shimmer h-4 w-4/5" />
            <div className="shimmer h-4 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export { ProductStripSkeleton }
