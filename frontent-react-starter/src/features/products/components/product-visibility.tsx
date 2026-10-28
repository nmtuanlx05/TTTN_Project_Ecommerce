import { cn } from "@/lib/utils";
import { VISIBILITY_LABEL } from "../constants";

/**
 * Trạng thái hiện/ẩn: chấm + chữ. Chấm đặc là đang hiện, chấm rỗng là đang ẩn — phân biệt bằng
 * hình dạng và nhãn chữ, không dựa vào màu.
 */
function ProductVisibility({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        isActive ? "text-ink" : "text-ink-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full border border-ink-muted",
          isActive && "border-ink bg-ink",
        )}
      />
      {isActive ? VISIBILITY_LABEL.visible : VISIBILITY_LABEL.hidden}
    </span>
  );
}

export { ProductVisibility };
