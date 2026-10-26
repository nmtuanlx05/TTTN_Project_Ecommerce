/** Chân trang gọn: bản quyền, năm lấy từ đồng hồ máy. */
function StorefrontFooter() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto w-full max-w-7xl px-gutter py-card">
        <p className="text-body-sm text-ink-muted">© {new Date().getFullYear()} MONO STUDIO</p>
      </div>
    </footer>
  )
}

export { StorefrontFooter }
