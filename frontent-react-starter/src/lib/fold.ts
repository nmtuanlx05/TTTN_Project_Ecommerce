/** Bỏ dấu, đổi thường, gọn khoảng trắng (cả `đ → d` vì NFD không tách được) để lọc/so khớp tiếng Việt; cùng ý với `fold()` ở backend. */
export function fold(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ")
}
