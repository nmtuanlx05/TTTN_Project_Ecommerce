// Cột slug là VARCHAR(191); chừa chỗ cho hậu tố "-2", "-3"... khi trùng.
const MAX_BASE_LENGTH = 180;

// Chuyển tên tiếng Việt thành slug kebab-case không dấu: "Áo Thun Nam" -> "ao-thun-nam".
// Trả chuỗi rỗng nếu tên không có chữ cái hoặc chữ số nào.
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/g, '');
}

// Chọn slug chưa bị chiếm: giữ nguyên `base` nếu còn trống, ngược lại thêm hậu tố -2, -3...
// `takenSlugs` là các slug đã có trong DB bắt đầu bằng `base`.
export function pickUniqueSlug(base: string, takenSlugs: string[]): string {
  const taken = new Set(takenSlugs.map((slug) => slug.toLowerCase()));
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }
  return `${base}-${suffix}`;
}
