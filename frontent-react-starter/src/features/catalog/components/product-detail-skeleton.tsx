/** Skeleton của trang chi tiết: cùng khung ảnh 3:4 và cùng lưới cột nên khi dữ liệu về bố cục không nhảy. */
function ProductDetailSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="shimmer aspect-[3/4] lg:col-span-7" />
      <div className="flex flex-col gap-6 lg:col-span-5">
        <div className="shimmer h-8 w-3/4" />
        <div className="shimmer h-6 w-1/4" />
        <div className="shimmer h-11 w-full" />
        <div className="shimmer h-11 w-2/3" />
        <div className="shimmer h-12 w-full" />
      </div>
    </div>
  )
}

export { ProductDetailSkeleton }
