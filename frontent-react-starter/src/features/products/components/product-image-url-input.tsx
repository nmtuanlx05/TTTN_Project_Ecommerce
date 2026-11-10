import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { IMAGE_URL_MAX_LENGTH, NEW_IMAGE_URL_REGEX } from "../constants"

/**
 * Thêm ảnh bằng URL (ảnh đã nằm ở nơi khác), nằm trong mục thu gọn. Kiểm tra ngay: chỉ https (backend chỉ nhận URL ngoài https), không quá dài, chưa có trong danh sách.
 * Chỉ siết cho URL MỚI thêm; ảnh đã lưu (kể cả http://localhost/uploads/...) vẫn giữ nguyên khi sửa sản phẩm.
 * Enter trong ô này chỉ thêm ảnh, KHÔNG gửi form sản phẩm.
 */
function ProductImageUrlInput({
  id,
  existing,
  disabled,
  onAdd,
}: {
  id: string
  existing: string[]
  disabled: boolean
  onAdd: (url: string) => void
}) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | undefined>()

  function submit() {
    const url = value.trim()
    if (url === "") return setError("Nhập đường dẫn ảnh.")
    if (url.length > IMAGE_URL_MAX_LENGTH) return setError(`Đường dẫn ảnh tối đa ${IMAGE_URL_MAX_LENGTH} ký tự.`)
    if (!NEW_IMAGE_URL_REGEX.test(url)) return setError("Đường dẫn ảnh phải bắt đầu bằng https://.")
    if (existing.includes(url)) return setError("Ảnh này đã có trong danh sách.")
    setError(undefined)
    setValue("")
    onAdd(url)
  }

  return (
    <details className="text-body-sm">
      <summary className="w-fit cursor-pointer rounded-xs text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Thêm ảnh bằng URL
      </summary>
      <div className="mt-2 flex items-start gap-inline">
        <Field
          className="min-w-0 flex-1"
          label="Đường dẫn ảnh"
          htmlFor={id}
          error={error}
          description="Dùng khi ảnh đã nằm ở nơi khác. Bắt đầu bằng https://."
        >
          <Input
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://"
            value={value}
            disabled={disabled}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              submit()
            }}
          />
        </Field>
        <Button type="button" variant="secondary" className="mt-6" disabled={disabled} onClick={submit}>
          <Plus />
          Thêm
        </Button>
      </div>
    </details>
  )
}

export { ProductImageUrlInput }
