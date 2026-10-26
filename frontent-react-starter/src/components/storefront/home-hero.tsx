/** Phần đầu trang chủ: chỉ chữ, không ảnh và không nút dẫn tới trang chưa có. */
function HomeHero() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-stack px-gutter py-section">
      <h1 className="max-w-4xl text-display uppercase text-ink">
        Thời trang tối giản cho mọi ngày
      </h1>
      <p className="max-w-prose text-body-lg text-ink-muted">
        Những thiết kế đơn sắc, dễ phối, may để mặc lâu.
      </p>
    </section>
  )
}

export { HomeHero }
