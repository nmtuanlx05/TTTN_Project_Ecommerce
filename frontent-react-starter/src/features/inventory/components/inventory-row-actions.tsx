import { useRef } from "react"
import { ClipboardCheck, Ellipsis, History, PackageMinus, PackagePlus, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { InventoryDialogKind } from "../use-inventory-dialog"
import type { InventoryItem } from "../types"

const MENU_ITEM = "min-h-control gap-inline px-3 text-body-sm"

/**
 * Nhập kho, Điều chỉnh và menu "⋯" (Xuất kho, Đặt ngưỡng, Xem lịch sử). Hộp thoại không nằm ở đây: nút chỉ báo
 * `onOpen` kèm chính nút đã bấm để hộp thoại trả focus về đúng chỗ khi đóng (mục menu bị gỡ khỏi DOM nên
 * với menu thì trả về nút "⋯").
 */
function InventoryRowActions({
  item,
  onOpen,
}: {
  item: InventoryItem
  onOpen: (kind: InventoryDialogKind, item: InventoryItem, trigger: HTMLElement | null) => void
}) {
  const moreRef = useRef<HTMLButtonElement>(null)
  const label = `${item.product.name}, ${item.size} · ${item.color}`

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="secondary"
        size="sm"
        aria-label={`Nhập kho: ${label}`}
        onClick={(event) => onOpen("import", item, event.currentTarget)}
      >
        <PackagePlus />
        Nhập kho
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Điều chỉnh tồn: ${label}`}
        onClick={(event) => onOpen("adjust", item, event.currentTarget)}
      >
        <ClipboardCheck />
        Điều chỉnh
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={moreRef}
              variant="ghost"
              size="icon-sm"
              aria-label={`Thao tác khác: ${label}`}
              title="Thao tác khác"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-2 text-caption text-ink-muted">
              Thao tác khác
            </DropdownMenuLabel>
            <DropdownMenuItem className={MENU_ITEM} onClick={() => onOpen("export", item, moreRef.current)}>
              <PackageMinus />
              Xuất kho
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} onClick={() => onOpen("minStock", item, moreRef.current)}>
              <Gauge />
              Đặt ngưỡng cảnh báo
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} onClick={() => onOpen("history", item, moreRef.current)}>
              <History />
              Xem lịch sử
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export { InventoryRowActions }
