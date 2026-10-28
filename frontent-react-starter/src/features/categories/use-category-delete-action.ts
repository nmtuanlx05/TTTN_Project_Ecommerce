import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import { useDialogTarget } from "@/hooks/use-dialog-target"
import { useDeleteCategory } from "./queries"
import type { Category } from "./types"

/**
 * Luồng xóa danh mục: luôn qua hộp xác nhận. Xong thì đóng hộp và báo bằng toast. Server từ chối
 * (409 còn sản phẩm/danh mục con, 403…) thì hộp vẫn mở và hiện message nguyên văn của server;
 * 404 (đã bị xóa ở nơi khác) thì đóng hộp và báo, danh sách tự làm mới.
 */
export function useCategoryDeleteAction() {
  const dialog = useDialogTarget<Category>()
  const remove = useDeleteCategory()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    const category = dialog.target
    if (!category) return
    setError(null)
    remove.mutate(category.id, {
      onSuccess: () => {
        dialog.hide()
        toast.add({
          title: "Đã xóa danh mục",
          description: category.name,
          data: { tone: "success" },
        })
      },
      onError: (apiError) => {
        if (apiError.statusCode === 404) {
          dialog.hide()
          toast.add({
            title: "Danh mục đã bị xóa",
            description: "Danh sách đã được làm mới.",
            data: { tone: "danger" },
          })
          return
        }
        setError(apiError.message)
      },
    })
  }

  return {
    request: (category: Category) => {
      setError(null)
      dialog.show(category)
    },
    dialogProps: {
      ...dialog.dialogProps,
      category: dialog.target,
      loading: remove.isPending,
      error,
      onConfirm: confirm,
    },
  }
}
