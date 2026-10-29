import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, type UseFormSetError } from "react-hook-form"
import { FormDialogBody, FormDialogFooter } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  createCategorySchema,
  updateCategorySchema,
  type CategoryFormValues,
} from "../schemas"
import type { Category } from "../types"
import { ParentSelect } from "./parent-select"

const SLUG_HINT_CREATE =
  "Bỏ trống để hệ thống tự tạo từ tên. Chỉ gồm chữ thường không dấu, số và dấu gạch ngang."
const SLUG_HINT_EDIT =
  "Đổi tên không tự đổi slug, để đường dẫn ổn định. Chỉ gồm chữ thường không dấu, số và dấu gạch ngang."

/**
 * Form Thêm (`category === null`) và Sửa. Mutation nằm ở `CategoryFormDialog`; component này
 * mount lại (reset sạch) mỗi lần mở hộp thoại. `formError` là lỗi của server không gắn được vào
 * ô nào (409 trùng tên/slug, 400 danh mục cha không hợp lệ…), hiện nguyên văn ở đầu form.
 */
function CategoryForm({
  category,
  busy,
  formError,
  onCancel,
  onSubmit,
}: {
  category: Category | null
  busy: boolean
  formError: string | null
  onCancel: () => void
  onSubmit: (
    values: CategoryFormValues,
    setError: UseFormSetError<CategoryFormValues>,
  ) => void
}) {
  const mode = category ? "edit" : "create"
  const id = useId()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(mode === "create" ? createCategorySchema : updateCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      parentId: category?.parentId ?? null,
      slug: category?.slug ?? "",
    },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values, setError))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormDialogBody>
        {formError ? (
          <Alert variant="danger">{formError}</Alert>
        ) : null}

        <Field label="Tên danh mục" htmlFor={`${id}-name`} required error={errors.name?.message}>
          <Input autoComplete="off" {...register("name")} />
        </Field>

        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <ParentSelect
              id={`${id}-parent`}
              value={field.value}
              editingId={category?.id}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {errors.parentId?.message ? (
          <p role="alert" className="-mt-2 text-caption text-danger-fg">
            {errors.parentId.message}
          </p>
        ) : null}

        <Field
          label="Slug"
          htmlFor={`${id}-slug`}
          required={mode === "edit"}
          error={errors.slug?.message}
          description={mode === "create" ? SLUG_HINT_CREATE : SLUG_HINT_EDIT}
        >
          <Input autoComplete="off" spellCheck={false} className="font-mono" {...register("slug")} />
        </Field>
      </FormDialogBody>

      <FormDialogFooter>
        <Button
          className="cursor-pointer"
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Hủy bỏ
        </Button>
        <Button
          className="cursor-pointer"
          type="submit"
          loading={busy}
          disabled={mode === "edit" && !isDirty}
        >
          {mode === "create" ? "Thêm danh mục" : "Lưu thay đổi"}
        </Button>
      </FormDialogFooter>
    </form>
  )
}

export { CategoryForm }
