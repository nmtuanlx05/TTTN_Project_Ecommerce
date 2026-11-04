import { STORE } from "@/lib/store-info"
import { cn } from "@/lib/utils"
import { AnnouncementMessageSet } from "./announcement-message-set"

/**
 * Số lượt thông điệp trong MỘT nửa dải. Dải gồm hai nửa giống hệt nhau và chỉ dịch đúng một nửa rồi lặp, nên mỗi nửa phải rộng
 * hơn màn hình lớn nhất cần hỗ trợ (một lượt hai thông điệp ~620px; 5 lượt ~3100px > 2560px), nếu không sẽ thấy khoảng trống.
 */
const SETS_PER_HALF = 5
const HALVES = [0, 1] as const
const SETS = Array.from({ length: SETS_PER_HALF }, (_, index) => index)

/**
 * Thanh thông báo chạy chữ phía trên header (mọi trang storefront). Không dính: cuộn là trượt đi, header dính vẫn như cũ.
 * Nền tối ở cả hai chế độ nhờ class `dark` (dùng bộ token tối trong phạm vi thanh này, không thêm token mới).
 *
 * Chạy bằng CSS (`animate-marquee`). Rê chuột hoặc focus bàn phím vào thanh thì dừng (`tabIndex={0}` để người dùng bàn phím dừng
 * được). Giảm chuyển động: không chạy, hiện tĩnh thông điệp đầu (cho xuống hai dòng nếu màn hình hẹp, không bị cắt). Chỉ lượt đầu tiên cho trình đọc màn hình; các lượt lặp `aria-hidden`.
 * Chưa có nút dừng cho cảm ứng (WCAG 2.2.2), xem mục "việc hoãn" ở docs/storefront-design.md.
 */
function AnnouncementBar({ messages = STORE.announcements }: { messages?: string[] }) {
  if (messages.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Thông báo của cửa hàng"
      tabIndex={0}
      className={cn(
        "dark group h-announcement overflow-hidden border-b border-border-strong bg-surface-sunken text-ink",
        // Vòng focus chung của global.css, nhưng lùi vào trong: ở mép trang, vòng ngoài sẽ bị `overflow-hidden` cắt mất.
        "focus-visible:-outline-offset-2",
      )}
    >
      <div
        className={cn(
          "flex h-full w-max animate-marquee items-center",
          "group-hover:[animation-play-state:paused] group-focus-visible:[animation-play-state:paused]",
          "motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center",
        )}
      >
        {HALVES.map((half) => (
          <div
            key={half}
            aria-hidden={half === 1 ? true : undefined}
            className={cn("flex shrink-0 items-center motion-reduce:min-w-0 motion-reduce:shrink", half === 1 && "motion-reduce:hidden")}
          >
            {SETS.map((set) => {
              const isReadable = half === 0 && set === 0
              return (
                <AnnouncementMessageSet
                  key={set}
                  messages={messages}
                  aria-hidden={isReadable ? undefined : true}
                  className={isReadable ? undefined : "motion-reduce:hidden"}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export { AnnouncementBar }
