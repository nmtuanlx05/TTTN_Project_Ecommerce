import { X } from "lucide-react"
import { SearchInput } from "@/components/admin/search-input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Role } from "@/types/user"
import { ROLE_LABEL, ROLES } from "../constants"

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
      <SearchInput
        value={q}
        onSearch={onSearch}
        placeholder="Tìm theo tên, email, số điện thoại"
        label="Tìm người dùng"
      />

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
