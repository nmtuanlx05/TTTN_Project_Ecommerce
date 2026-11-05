import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronDown } from "lucide-react"
import { controlClasses } from "@/components/ui/input"
import { fold } from "@/lib/fold"
import { cn } from "@/lib/utils"

interface SearchSelectOption {
  value: string
  label: string
}

/**
 * Ô chọn một giá trị có gõ để lọc (bỏ dấu, không phân biệt hoa/thường), bọc mỏng Base UI Combobox. Trông như `ui/select` (có mũi tên); bàn phím do Base UI lo.
 * `value` là mã đang chọn ("" = chưa chọn). `id`, `aria-invalid`, `aria-describedby` đặt lên ô nhập để `Field` gắn nhãn/lỗi được.
 */
function SearchSelect({
  options,
  value,
  onValueChange,
  placeholder,
  emptyText = "Không có kết quả",
  disabled,
  id,
  className,
  ...aria
}: {
  options: readonly SearchSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  id?: string
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  const selected = options.find((option) => option.value === value) ?? null
  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(next: SearchSelectOption | null) => onValueChange(next?.value ?? "")}
      itemToStringLabel={(item: SearchSelectOption) => item.label}
      isItemEqualToValue={(a: SearchSelectOption, b: SearchSelectOption) => a.value === b.value}
      filter={(item: SearchSelectOption, query: string) => fold(item.label).includes(fold(query))}
      disabled={disabled}
      autoHighlight
    >
      <div className={cn("relative", className)}>
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(controlClasses, "h-control pr-9 pl-3 text-ellipsis")}
          {...aria}
        />
        <Combobox.Trigger
          aria-label="Mở danh sách"
          tabIndex={-1}
          className="absolute inset-y-0 right-0 grid w-9 place-items-center text-ink-muted"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50">
          <Combobox.Popup className="max-h-72 w-(--anchor-width) overflow-y-auto rounded-md border border-border-default bg-surface-raised p-1 text-body-sm text-ink">
            <Combobox.Empty className="px-2.5 py-2 text-ink-muted empty:hidden">{emptyText}</Combobox.Empty>
            <Combobox.List>
              {(item: SearchSelectOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="flex cursor-default items-center justify-between gap-inline rounded-xs px-2.5 py-2 outline-none select-none data-highlighted:bg-surface-hover"
                >
                  <span>{item.label}</span>
                  <Combobox.ItemIndicator>
                    <Check className="size-4" aria-hidden="true" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

export { SearchSelect }
export type { SearchSelectOption }
