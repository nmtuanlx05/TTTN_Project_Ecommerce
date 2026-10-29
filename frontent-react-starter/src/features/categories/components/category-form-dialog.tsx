import { useState } from "react"
import type { UseFormSetError } from "react-hook-form"
import { FormDialog } from "@/components/shared/form-dialog"
import { useToast } from "@/components/ui/toast"
import type { ApiError } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { useCreateCategory, useUpdateCategory } from "../queries"
import type { CategoryFormValues } from "../schemas"
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "../types"
import { CategoryForm } from "./category-form"

/** Các ô nhìn thấy trong form; lỗi 400 của trường khác đi vào Alert đầu form. */
const FORM_FIELDS = ["name", "parentId", "slug"] as const

/** Trường bỏ trống thì không gửi: slug rỗng để backend tự sinh, gốc thì không có parentId. */
function buildCreateInput(values: CategoryFormValues): CreateCategoryInput {
  const input: CreateCategoryInput = { name: values.name }
  if (values.parentId !== null) input.parentId = values.parentId
  if (values.slug !== "") input.slug = values.slug
  return input
}

/**
 * Chỉ gửi trường thật sự đổi. `parentId: null` là giá trị có nghĩa khi sửa (đưa về gốc),
 * còn không gửi `parentId` thì backend giữ nguyên.
 */
function buildUpdateInput(category: Category, values: CategoryFormValues): UpdateCategoryInput {
  const input: UpdateCategoryInput = {}
  if (values.name !== category.name) input.name = values.name
  if (values.parentId !== category.parentId) input.parentId = values.parentId
  if (values.slug !== category.slug) input.slug = values.slug
  return input
}

/**
 * Hộp thoại Thêm (`category === null`) và Sửa. Hai mutation nằm ở đây, không nằm trong form:
 * hộp thoại cần biết đang gọi API để khóa việc đóng, còn form bên trong mount lại mỗi lần mở.
 */
function CategoryFormDialog({
  open,
  category,
  onOpenChange,
}: {
  open: boolean
  category: Category | null
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const mode = category ? "edit" : "create"
  const busy = createMutation.isPending || updateMutation.isPending

  function handleOpenChange(next: boolean) {
    if (!next) setFormError(null)
    onOpenChange(next)
  }

  /**
   * 400 theo ô → vào đúng ô; 404 (đã bị xóa) → toast và đóng; 403 → toast; còn lại
   * (409 trùng tên/slug, 400 không theo ô, lỗi mạng, 5xx) → Alert nguyên văn trong form.
   */
  function handleError(error: ApiError, setError: UseFormSetError<CategoryFormValues>) {
    if (error.statusCode === 404 && category) {
      toast.add({
        title: "Không tìm thấy danh mục này",
        description: "Danh mục có thể đã bị xóa. Danh sách đã được làm mới.",
        data: { tone: "danger" },
      })
      handleOpenChange(false)
      return
    }

    if (error.statusCode === 403) {
      toast.add({
        title: "Không đủ quyền",
        description: error.message,
        data: { tone: "danger" },
      })
      return
    }

    if (error.statusCode === 400) {
      setFormError(applyServerErrors(error, setError, FORM_FIELDS))
      return
    }

    setFormError(error.message)
  }

  function submit(values: CategoryFormValues, setError: UseFormSetError<CategoryFormValues>) {
    setFormError(null)

    if (category) {
      const input = buildUpdateInput(category, values)
      if (Object.keys(input).length === 0) {
        handleOpenChange(false)
        return
      }
      updateMutation.mutate(
        { id: category.id, input },
        {
          onSuccess: (saved) => {
            toast.add({
              title: "Đã lưu thay đổi",
              description: saved.name,
              data: { tone: "success" },
            })
            handleOpenChange(false)
          },
          onError: (error) => handleError(error, setError),
        },
      )
      return
    }

    createMutation.mutate(buildCreateInput(values), {
      onSuccess: (created) => {
        toast.add({
          title: "Đã thêm danh mục",
          description: created.name,
          data: { tone: "success" },
        })
        handleOpenChange(false)
      },
      onError: (error) => handleError(error, setError),
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      busy={busy}
      title={mode === "create" ? "Thêm danh mục" : "Sửa danh mục"}
      description={
        mode === "create"
          ? "Tạo danh mục mới để sắp xếp sản phẩm."
          : "Cập nhật tên, danh mục cha và slug."
      }
    >
      <CategoryForm
        category={category}
        busy={busy}
        formError={formError}
        onCancel={() => handleOpenChange(false)}
        onSubmit={submit}
      />
    </FormDialog>
  )
}

export { CategoryFormDialog }
