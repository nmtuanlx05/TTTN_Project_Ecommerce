import { FormDialogFooter } from "@/components/shared/form-dialog"
import { Button } from "@/components/ui/button"

/** Chân hộp thoại form kho: Hủy bỏ + nút gửi (khóa và hiện spinner khi đang gửi). */
function StockFormActions({
  submitLabel,
  busy,
  submitDisabled = false,
  onCancel,
}: {
  submitLabel: string
  busy: boolean
  submitDisabled?: boolean
  onCancel: () => void
}) {
  return (
    <FormDialogFooter>
      <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
        Hủy bỏ
      </Button>
      <Button type="submit" loading={busy} disabled={submitDisabled}>
        {submitLabel}
      </Button>
    </FormDialogFooter>
  )
}

export { StockFormActions }
