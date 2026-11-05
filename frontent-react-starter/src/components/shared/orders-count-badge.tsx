const MAX_COUNT = 9

/** Huy hiệu số đơn đang hoạt động cạnh mục "Đơn hàng của tôi" (menu người dùng, ngăn kéo di động). 0 thì ẩn. */
function OrdersCountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <>
      <span
        aria-hidden="true"
        className="ml-auto grid h-5 min-w-5 place-items-center rounded-4xl bg-primary px-1.5 text-caption leading-none font-semibold text-primary-fg!"
      >
        {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
      </span>
      <span className="sr-only">{count} đơn đang hoạt động</span>
    </>
  )
}

export { OrdersCountBadge }
