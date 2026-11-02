/** Liên kết đầu tiên của trang: người dùng bàn phím nhảy thẳng tới nội dung. Chỉ hiện khi được focus. */
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:rounded-xs focus:bg-primary focus:px-4 focus:py-3 focus:text-body-sm focus:text-primary-fg"
    >
      Bỏ qua tới nội dung
    </a>
  )
}

export { SkipLink }
