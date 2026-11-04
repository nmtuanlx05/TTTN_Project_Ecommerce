import { cn } from "@/lib/utils"
import { PAGE_SIZE } from "../constants"
import { GRID_BASE, GRID_CLASS, type GridLayout } from "./product-grid"

/** Skeleton cùng tỉ lệ 3:4 và cùng lưới với thẻ thật nên khi dữ liệu về bố cục không nhảy. Chỉ cho lần tải đầu. */
function ProductGridSkeleton({ layout, count = PAGE_SIZE }: { layout: GridLayout; count?: number }) {
  return (
    <ul aria-hidden="true" className={cn(GRID_BASE, GRID_CLASS[layout])}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex flex-col gap-3">
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

export { ProductGridSkeleton }
