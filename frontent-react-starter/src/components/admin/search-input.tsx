import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const SEARCH_DEBOUNCE_MS = 300

/**
 * Ô tìm kiếm của thanh công cụ bảng. Giữ chữ gõ trong state cục bộ và chỉ đẩy lên
 * URL sau 300ms không gõ thêm. Khi URL đổi từ bên ngoài (Back, Xóa bộ lọc) thì ô tự theo.
 */
function SearchInput({
  value,
  onSearch,
  placeholder,
  label,
}: {
  value: string
  onSearch: (value: string) => void
  placeholder: string
  /** Tên đọc cho trình đọc màn hình. */
  label: string
}) {
  const [text, setText] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)

  // URL đổi mà không phải do chính mình đẩy lên (khi đó URL luôn bằng chữ đang gõ).
  if (value !== previousValue) {
    setPreviousValue(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) return
    const timer = setTimeout(() => onSearch(text.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value, onSearch])

  return (
    <div className="relative min-w-0 flex-1 md:max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
      />
    </div>
  )
}

export { SearchInput }
