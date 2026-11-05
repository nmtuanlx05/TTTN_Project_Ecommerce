const MAX_COUNT = 99

/** Huy hiệu số đếm cạnh một mục điều hướng admin. 0 thì ẩn. Nền nổi + viền nên đọc được cả khi mục đang chọn (nền mực). */
function NavCountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <>
      <span
        aria-hidden="true"
        className="ml-auto grid h-5 min-w-5 place-items-center rounded-4xl border border-border-strong bg-surface-raised px-1.5 text-caption leading-none font-semibold text-ink"
      >
        {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
      </span>
      <span className="sr-only">
        {count} {label}
      </span>
    </>
  )
}

export { NavCountBadge }
