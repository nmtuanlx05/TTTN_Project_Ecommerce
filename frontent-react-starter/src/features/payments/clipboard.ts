/** Sao chép văn bản; trả `true` nếu thành công. Dùng Clipboard API (cần https hoặc localhost), dự phòng bằng `execCommand` cho ngữ cảnh không an toàn. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Bị từ chối quyền: thử cách dự phòng bên dưới.
  }
  try {
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
