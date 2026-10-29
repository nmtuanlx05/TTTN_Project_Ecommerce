import { useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { ImageUploadField } from "@/components/shared/image-upload-field"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { IMAGE_URL_MAX_LENGTH } from "../constants"
import type { ProductFormValues } from "../schemas"

/**
 * Ảnh sản phẩm: upload ảnh (`ImageUploadField`, kind "products") hoặc, ở mục thu gọn, nhập URL tay cho
 * ảnh nằm ở nơi khác (vd. dữ liệu cũ). Cả hai cùng ghi vào trường `imageUrl` của form nên luôn đồng bộ,
 * và logic payload ở `form-mapping.ts` không đổi: tạo mà trống thì không gửi, sửa mà xóa thì gửi `null`.
 */
function ProductImageField({
  id,
  onUploadingChange,
}: {
  id: string
  /** Form dùng để khóa nút Lưu trong lúc ảnh đang tải lên. */
  onUploadingChange: (uploading: boolean) => void
}) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const url = useWatch({ control, name: "imageUrl" }).trim()
  const [manualOpen, setManualOpen] = useState(false)
  const error = errors.imageUrl?.message

  return (
    <div className="flex flex-col gap-stack">
      <ImageUploadField
        label="Ảnh sản phẩm"
        kind="products"
        shape="square"
        value={url || null}
        error={error}
        onUploadingChange={onUploadingChange}
        // Đánh dấu form đã đổi (mở nút Lưu ở trang sửa) và kiểm lại ngay giá trị mới.
        onChange={(next) =>
          setValue("imageUrl", next ?? "", {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
      />

      {/* Mở sẵn khi trường đang lỗi để người dùng thấy ô cần sửa. */}
      <details
        open={manualOpen || Boolean(error)}
        onToggle={(event) => setManualOpen(event.currentTarget.open)}
        className="text-body-sm"
      >
        <summary className="w-fit cursor-pointer rounded-xs text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Nhập URL ảnh
        </summary>
        <Field
          className="mt-2"
          label="Đường dẫn ảnh"
          htmlFor={id}
          description={`Dùng khi ảnh đã nằm ở nơi khác. URL bắt đầu bằng http:// hoặc https://, tối đa ${IMAGE_URL_MAX_LENGTH} ký tự. Xóa trống để bỏ ảnh.`}
        >
          <Input
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://"
            aria-invalid={error ? true : undefined}
            {...register("imageUrl")}
          />
        </Field>
      </details>
    </div>
  )
}

export { ProductImageField }
