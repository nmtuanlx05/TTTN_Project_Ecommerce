import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Role } from "../types"
import { ROLE_LABEL, ROLES } from "../constants"

const SEARCH_DEBOUNCE_MS = 300
const ALL = "all"

const ROLE_ITEMS = [
  { value: ALL, label: "Mọi vai trò" },
  ...ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
]

const STATUS_ITEMS = [
  { value: ALL, label: "Mọi trạng thái" },
  { value: "true", label: "Hoạt động" },
  { value: "false", label: "Đã khóa" },
]

/**
 * Ô tìm kiếm giữ chữ gõ trong state cục bộ và chỉ đẩy lên URL sau 300ms không
 * gõ thêm. Khi URL đổi từ bên ngoài (Back, Xóa bộ lọc) thì ô tự theo.
 */
function SearchInput({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
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
        placeholder="Tìm theo tên, email, số điện thoại"
        aria-label="Tìm người dùng"
        className="pl-9"
      />
    </div>
  )
}

function UsersToolbar({
  q,
  role,
  isActive,
  hasFilters,
  onSearch,
  onRoleChange,
  onActiveChange,
  onClear,
}: {
  q: string
  role: Role | undefined
  isActive: boolean | undefined
  hasFilters: boolean
  onSearch: (value: string) => void
  onRoleChange: (role: Role | undefined) => void
  onActiveChange: (isActive: boolean | undefined) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-inline md:flex-row md:items-center">
      <SearchInput value={q} onSearch={onSearch} />

      <div className="flex flex-col gap-inline sm:flex-row sm:items-center">
        <Select
          items={ROLE_ITEMS}
          value={role ?? ALL}
          onValueChange={(next) =>
            onRoleChange(next === ALL ? undefined : (next as Role))
          }
        >
          <SelectTrigger aria-label="Lọc theo vai trò" className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={STATUS_ITEMS}
          value={isActive === undefined ? ALL : String(isActive)}
          onValueChange={(next) =>
            onActiveChange(next === ALL ? undefined : next === "true")
          }
        >
          <SelectTrigger aria-label="Lọc theo trạng thái" className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button variant="ghost" onClick={onClear}>
            <X />
            Xóa bộ lọc
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { UsersToolbar }
