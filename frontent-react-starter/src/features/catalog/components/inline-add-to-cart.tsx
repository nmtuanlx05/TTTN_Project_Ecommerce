import { useEffect, useId, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useInlineAdd } from "../use-inline-add"
import { findVariant } from "../variant-options"
import { VariantPicker } from "./variant-picker"

/**
 * Nút "Thêm vào giỏ hàng" của thẻ trong ngăn kéo yêu thích + vùng chọn biến thể mở rộng NGAY DƯỚI nút (xem `useInlineAdd`). `expanded` do ngăn kéo giữ (chỉ một thẻ mở cùng lúc).
 * Focus: mở vùng chọn thì focus vào lựa chọn đang chọn đầu tiên (radio có `aria-checked`); thu lại bằng nút thì trả focus về nút "Thêm vào giỏ hàng". Thêm THÀNH CÔNG thì vùng chọn thu lại nhưng KHÔNG trả focus: ngăn kéo giỏ vừa mở và đã nhận focus.
 * Thẻ khác mở làm thẻ này thu lại thì KHÔNG cướp focus. Chọn size hết hàng không được (`inStockOnly`), nên nút "Xác nhận" luôn ứng với biến thể còn hàng.
 */
function InlineAddToCart({
  slug,
  expanded,
  onExpandedChange,
}: {
  slug: string
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}) {
  const add = useInlineAdd(slug)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = expanded && add.detail !== null && add.choice !== null

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus()
  }, [open])

  const collapse = () => {
    onExpandedChange(false)
    buttonRef.current?.focus()
  }

  const onButton = async () => {
    if (expanded) return collapse()
    const result = await add.start()
    if (result === "expand") onExpandedChange(true)
  }

  const variant = add.detail && add.choice ? findVariant(add.detail.variants, add.choice) : undefined

  return (
    <div className="flex flex-col gap-3">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        loading={add.loading}
        aria-expanded={expanded}
        aria-controls={open ? panelId : undefined}
        onClick={() => void onButton()}
        className="press w-full rounded-4xl border-border-control"
      >
        Thêm vào giỏ hàng
      </Button>
      {open && add.detail && add.choice ? (
        <div ref={panelRef} id={panelId} role="group" aria-label={`Chọn phân loại ${add.detail.name}`} className="flex flex-col gap-4 rounded-card bg-surface-sunken/50 p-3">
          <VariantPicker compact inStockOnly variants={add.detail.variants} choice={add.choice} onChange={add.setChoice} />
          <Button
            type="button"
            loading={add.adding}
            disabled={!variant?.inStock}
            onClick={() => {
              if (variant) void add.confirm(variant.id).then((ok) => ok && onExpandedChange(false))
            }}
            className="press w-full rounded-4xl"
          >
            Xác nhận
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export { InlineAddToCart }
