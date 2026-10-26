/**
 * Tên hiển thị của một tài khoản: `name` đã cắt khoảng trắng; trống (dữ liệu cũ chưa có tên)
 * thì lấy phần trước dấu @ của email. Hai người có thể trùng phần đó, nên chỗ cần phân biệt
 * (hộp xác nhận khóa tài khoản...) phải hiện kèm email.
 */
export function displayName(account: { name: string | null; email: string }): string {
  const name = account.name?.trim()
  if (name) return name
  return account.email.split("@")[0] || account.email
}
