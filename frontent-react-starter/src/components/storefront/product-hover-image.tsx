import { useState } from "react"
import { cn } from "@/lib/utils"

const LOADABLE_SRC = /^https?:\/\//i

/**
 * Ảnh thứ hai của thẻ sản phẩm, chồng lên ảnh chính trong cùng khung (nên không giật bố cục). Chỉ trang trí: `alt=""` và `aria-hidden`.
 * Luôn `opacity-0` cho tới khi ĐÃ TẢI XONG (`onLoad`) và người dùng đang rê chuột/focus vào phần tử cha `group/card` trên thiết bị có hover;
 * trong lúc chờ vẫn thấy ảnh đầu, không có ô trống. Tải lỗi thì bỏ qua (giữ nguyên ảnh đầu). Chuyển mờ chỉ chạy khi không giảm chuyển động.
 * Nơi dùng chỉ dựng component này sau lần hover/focus đầu tiên (xem `armed` ở `ProductCard`) để không tải ảnh thừa cho cả lưới.
 */
function ProductHoverImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)
  if (!LOADABLE_SRC.test(src)) return null

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      decoding="async"
      referrerPolicy="no-referrer"
      data-loaded={loaded}
      onLoad={() => setLoaded(true)}
      className={cn(
        "pointer-events-none absolute inset-0 size-full object-cover opacity-0 motion-safe:transition-opacity motion-safe:duration-(--motion-image) motion-safe:ease-smooth",
        "[@media(hover:hover)]:group-hover/card:data-[loaded=true]:opacity-100 [@media(hover:hover)]:group-focus-within/card:data-[loaded=true]:opacity-100",
      )}
    />
  )
}

export { ProductHoverImage }
