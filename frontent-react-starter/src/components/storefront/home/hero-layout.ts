/**
 * Hằng số bố cục của hero dùng chung cho `HeroSlide` (cột chữ/cột ảnh) và `HeroControls` (hàng điều khiển nằm đè đúng bề rộng cột chữ), để hai nơi
 * không lệch nhau. Ghi thành chuỗi class ĐẦY ĐỦ vì Tailwind chỉ nhận class viết nguyên văn trong mã.
 */

/** Từ `lg`: cột chữ 46%, cột ảnh 54% (ảnh tràn sát mép phải màn hình, cột chữ canh theo container). */
export const HERO_SPLIT_CLASS = "lg:grid-cols-[46fr_54fr]"

/** Bề rộng cột chữ từ `lg` (= 46fr trên tổng 100) cho hàng điều khiển. */
export const HERO_TEXT_WIDTH_CLASS = "lg:w-[46%]"

/**
 * Di động: ảnh vuông nhưng cao tối đa 40% chiều cao màn hình (`svh`), để tiêu đề và nút chính còn trong màn hình đầu ở 375×667 (đã đo). Màn hình đủ cao
 * (≥ ~940px ở bề rộng 375) thì vẫn vuông; thấp hơn thì ảnh cắt bớt chiều cao (`object-cover`, vùng giữ lại theo `objectPosition`).
 */
export const HERO_IMAGE_MOBILE_CLASS = "aspect-square max-h-[40svh]"
