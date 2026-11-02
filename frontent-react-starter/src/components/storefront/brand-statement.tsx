import { STORE } from "@/lib/store-info"

/** Dải tuyên bố thương hiệu: một câu lớn, nhiều khoảng trắng. Nội dung lấy từ `lib/store-info.ts` (không viết cam kết kinh doanh vào đó). */
function BrandStatement() {
  return (
    <section aria-label="Thương hiệu" className="border-t border-border-subtle pt-block">
      <p className="max-w-4xl text-h1 text-balance text-ink">{STORE.statement}</p>
    </section>
  )
}

export { BrandStatement }
