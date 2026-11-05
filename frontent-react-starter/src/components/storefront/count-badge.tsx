/**
 * Huy hiệu số lượng góc trên phải của một nút icon ở header (giỏ hàng, yêu thích): "N+" khi quá `max`. Chỉ trang trí (`aria-hidden`); số được đọc qua `aria-label` của nút.
 * `key={count}` để mỗi lần số đổi là chạy lại hiệu ứng nảy. 0 thì không dựng.
 */
function CountBadge({ count, max }: { count: number; max: number }) {
  if (count <= 0) return null
  return (
    <span
      key={count}
      aria-hidden="true"
      className="motion-safe:animate-badge-bump absolute top-1 right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-4xl bg-primary px-1 text-[0.6875rem] leading-none font-semibold text-primary-fg"
    >
      {count > max ? `${max}+` : count}
    </span>
  )
}

export { CountBadge }
