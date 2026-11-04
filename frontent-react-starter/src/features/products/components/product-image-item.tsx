import { ArrowDown, ArrowUp, Trash2 } from "lucide-react"
import { ImagePreview } from "@/components/shared/image-preview"
import { Button } from "@/components/ui/button"

/**
 * Một ảnh trong danh sách ảnh sản phẩm: ảnh thu nhỏ (bấm xem lớn), nhãn "Ảnh đại diện" cho ảnh đầu, nút lên/xuống đổi thứ tự (vô hiệu ở đầu/cuối) và xóa.
 * `data-pos`/`data-act` để `ProductImagesField` trả focus về đúng nút sau khi đổi thứ tự.
 */
function ProductImageItem({
  url,
  index,
  total,
  onMove,
  onRemove,
}: {
  url: string
  index: number
  total: number
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const label = `ảnh ${index + 1}`

  return (
    <li data-pos={index} className="flex items-center gap-3 rounded-md border border-border-subtle p-2">
      <ImagePreview src={url} alt={`Ảnh ${index + 1} của sản phẩm`} shape="portrait" zoomable className="w-14" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-ink">{index === 0 ? "Ảnh đại diện" : `Ảnh ${index + 1}`}</p>
        <p className="truncate text-caption text-ink-muted" title={url}>
          {url}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-act="up"
          disabled={index === 0}
          aria-label={`Đưa ${label} lên trước`}
          onClick={() => onMove(-1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-act="down"
          disabled={index === total - 1}
          aria-label={`Đưa ${label} xuống sau`}
          onClick={() => onMove(1)}
        >
          <ArrowDown />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa ${label}`} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

export { ProductImageItem }
