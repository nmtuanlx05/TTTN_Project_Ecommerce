import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import { useDialogTarget } from "@/hooks/use-dialog-target"
import { useSetProductStatus } from "./queries"
import type { ProductListItem } from "./types"

/** Phần tối thiểu của sản phẩm mà luồng ẩn/hiện cần; cả dòng danh sách lẫn chi tiết đều thỏa. */
export type ProductStatusTarget = Pick<ProductListItem, "id" | "name" | "slug" | "isActive">

/**
 * Luồng ẩn / hiện sản phẩm. Ẩn luôn qua hộp xác nhận; server từ chối thì hộp vẫn mở và hiện message
 * nguyên văn. Hiện lại thì làm ngay (không mất gì), lỗi báo bằng toast. 404 (đã bị xóa ở nơi khác)
 * thì đóng hộp và báo, danh sách tự làm mới.
 */
export function useProductStatusAction() {
  const dialog = useDialogTarget<ProductStatusTarget>()
  const setStatus = useSetProductStatus()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  function apply(product: ProductStatusTarget, isActive: boolean, viaDialog: boolean) {
    setError(null)
    setStatus.mutate(
      { id: product.id, isActive },
      {
        onSuccess: () => {
          if (viaDialog) dialog.hide()
          toast.add({
            title: isActive ? "Đã hiện sản phẩm" : "Đã ẩn sản phẩm",
            description: product.name,
            data: { tone: "success" },
          })
        },
        onError: (apiError) => {
          if (apiError.statusCode === 404) {
            if (viaDialog) dialog.hide()
            toast.add({
              title: "Không tìm thấy sản phẩm này",
              description: "Sản phẩm có thể đã bị xóa. Danh sách đã được làm mới.",
              data: { tone: "danger" },
            })
            return
          }
          if (viaDialog) setError(apiError.message)
          else {
            toast.add({
              title: "Không hiện lại được sản phẩm",
              description: apiError.message,
              data: { tone: "danger" },
            })
          }
        },
      },
    )
  }

  function confirmHide() {
    if (dialog.target) apply(dialog.target, false, true)
  }

  return {
    request: (product: ProductStatusTarget) => {
      if (product.isActive) {
        setError(null)
        dialog.show(product)
      } else {
        apply(product, true, false)
      }
    },
    /** id sản phẩm đang chờ phản hồi, để dòng đó hiện trạng thái đang xử lý. */
    pendingId: setStatus.isPending ? setStatus.variables?.id : undefined,
    dialogProps: {
      ...dialog.dialogProps,
      product: dialog.target,
      loading: setStatus.isPending,
      error,
      onConfirm: confirmHide,
    },
  }
}
