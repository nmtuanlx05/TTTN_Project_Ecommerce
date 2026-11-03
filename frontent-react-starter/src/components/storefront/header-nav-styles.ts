/** Chữ của mục điều hướng và dòng trong bảng: viết hoa, giãn 0.1em (`tracking-widest`), vừa đậm, màu mực. */
export const NAV_TEXT = "font-medium tracking-widest text-ink uppercase"

/**
 * Hover, focus, đang mở (`aria-expanded`) và đang xem (`aria-current`) đều hiện gạch chân 1px dưới chữ; chuyển theo token chuyển động.
 * Không đổi màu chữ, nên trạng thái luôn đọc được cả khi không phân biệt màu.
 */
export const NAV_UNDERLINE =
  "underline decoration-transparent decoration-1 underline-offset-8 transition-colors duration-(--motion-fast) ease-smooth " +
  "hover:decoration-ink focus-visible:decoration-ink aria-expanded:decoration-ink aria-[current=page]:decoration-ink"
