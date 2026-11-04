/**
 * Bề rộng cột chữ của hero từ `lg` (= 46fr trên tổng 100), dùng cho hàng điều khiển nằm đè đúng cột chữ. Số 46 phải khớp `HERO_SPLIT_CLASS`
 * (`lg:grid-cols-[46fr_54fr]`) ở `hero-slide.tsx`. Ghi thành chuỗi class ĐẦY ĐỦ vì Tailwind chỉ nhận class viết nguyên văn trong mã.
 */
export const HERO_TEXT_WIDTH_CLASS = "lg:w-[46%]"
