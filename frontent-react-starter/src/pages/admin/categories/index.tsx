import { Plus } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { useCurrentRole } from "@/features/auth/use-current-role"
import { CategoriesContent } from "@/features/categories/components/categories-content"
import { CategoriesToolbar } from "@/features/categories/components/categories-toolbar"
import { CategoryDeleteDialog } from "@/features/categories/components/category-delete-dialog"
import { CategoryFormDialog } from "@/features/categories/components/category-form-dialog"
import type { Category } from "@/features/categories/types"
import { useCategoriesSearchParams } from "@/features/categories/use-categories-search-params"
import { useCategoryDeleteAction } from "@/features/categories/use-category-delete-action"
import { useDialogTarget } from "@/hooks/use-dialog-target"

function CategoriesPage() {
  // ADMIN thêm/sửa/xóa; STAFF chỉ xem và sửa. Ẩn nút chỉ để gọn, backend mới là nơi chặn thật.
  const canManage = useCurrentRole() === "ADMIN"
  const search = useCategoriesSearchParams()
  const form = useDialogTarget<Category>()
  const remove = useCategoryDeleteAction()

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Danh mục"
        description="Sắp xếp sản phẩm vào danh mục để khách dễ tìm."
        actions={
          canManage ? (
            <Button className="cursor-pointer" onClick={() => form.show(null)}>
              <Plus />
              Thêm danh mục
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-stack">
        <CategoriesToolbar
          q={search.q}
          hasFilters={search.hasFilters}
          onSearch={search.setQuery}
          onClear={search.clearFilters}
        />
        <CategoriesContent
          search={search}
          canManage={canManage}
          onCreate={() => form.show(null)}
          onEdit={form.show}
          onDelete={remove.request}
        />
      </div>

      <CategoryFormDialog {...form.dialogProps} category={form.target} />
      <CategoryDeleteDialog {...remove.dialogProps} />
    </div>
  )
}

export default CategoriesPage
