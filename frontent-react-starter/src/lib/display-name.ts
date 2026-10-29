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

/** Ngăn cách từ khi lấy chữ cái đầu từ phần trước dấu @ của email. */
const EMAIL_WORD_SEPARATOR = /[\s._-]+/u

/** Chữ cái đầu tiên của một từ (giữ nguyên dấu), bỏ qua số và dấu câu; từ không có chữ cái thì `null`. */
function firstLetter(word: string): string | null {
  // NFC: "ấ" dựng sẵn là một ký tự; nếu để dạng tách (a + dấu mũ + dấu sắc) thì chỉ lấy được "a".
  for (const char of word.normalize("NFC")) {
    if (/\p{L}/u.test(char)) return char.toLocaleUpperCase("vi")
  }
  return null
}

/**
 * Chữ cái đầu của HAI TỪ CUỐI trong họ tên, viết hoa theo tiếng Việt, dùng làm avatar khi chưa có ảnh.
 * Tên chỉ có một từ thì một chữ cái. Từ không chứa chữ cái nào (số, dấu) bị bỏ qua.
 *
 * - "Nguyễn Mạnh Tuấn" và "Mạnh Tuấn" → "MT"
 * - "Đặng An" → "ĐA"; "Tuấn" → "T"; "Lê 2 Anh" → "LA"
 * - `name` trống: lấy phần trước dấu @ của email, tách theo khoảng trắng, dấu chấm, gạch dưới, gạch ngang:
 *   "tuan.nguyen@x.vn" → "TN"; "a_b-c@x.vn" → "BC"
 * Không tìm được chữ cái nào thì trả "?".
 */
export function initialsOf(account: { name: string | null; email: string }): string {
  const name = account.name?.trim()
  const words = name
    ? name.split(/\s+/u)
    : (account.email.split("@")[0] ?? "").split(EMAIL_WORD_SEPARATOR)
  const letters = words.flatMap((word) => firstLetter(word) ?? [])
  return letters.slice(-2).join("") || "?"
}
