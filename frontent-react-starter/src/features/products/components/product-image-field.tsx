import { useFormContext, useWatch } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { IMAGE_URL_MAX_LENGTH, IMAGE_URL_REGEX } from "../constants"
import type { ProductFormValues } from "../schemas"
import { ProductThumb } from "./product-thumb"

/** Ảnh sản phẩm: dán một URL (chưa hỗ trợ tải ảnh lên), kèm xem trước. */
function ProductImageField({ id }: { id: string }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const url = useWatch({ control, name: "imageUrl" }).trim()
  const previewable = url.length <= IMAGE_URL_MAX_LENGTH && IMAGE_URL_REGEX.test(url)

  return (
    <div className="flex flex-col gap-stack sm:flex-row sm:items-start">
      <Field
        className="min-w-0 flex-1"
        label="Đường dẫn ảnh"
        htmlFor={id}
        error={errors.imageUrl?.message}
        description={`Dán URL ảnh bắt đầu bằng http:// hoặc https://, tối đa ${IMAGE_URL_MAX_LENGTH} ký tự. Bỏ trống nếu chưa có ảnh.`}
      >
        <Input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
          {...register("imageUrl")}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium text-ink">Xem trước</span>
        <ProductThumb src={previewable ? url : null} alt="Xem trước ảnh sản phẩm" className="w-28" />
      </div>
    </div>
  )
}

export { ProductImageField }
