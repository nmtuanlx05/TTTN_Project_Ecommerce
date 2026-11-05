import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import { REORDER_REASON_LABEL } from "./constants"
import { useReorder } from "./queries"

/** Nội dung hộp thoại kết quả mua lại. `openCartAfter`: đóng xong thì mở giỏ (đã thêm được ít nhất một dòng). */
export interface ReorderNotice {
  title: string
  lines: string[]
  openCartAfter: boolean
}

/**
 * Trạng thái hủy đơn (mã đơn đang xác nhận hủy) và mua lại, dùng chung cho danh sách và chi tiết.
 * `onReordered`: trang truyền vào để làm mới giỏ và mở ngăn kéo (features/orders không import features/cart).
 * Thêm trọn vẹn thì toast ngắn rồi gọi `onReordered` ngay; có dòng bỏ qua (hoặc không thêm được dòng nào) thì hộp thoại liệt kê lý do,
 * và `onReordered` chạy SAU khi hộp thoại đóng xong để hai lớp nền không chồng nhau.
 */
export function useOrderActions({ onReordered }: { onReordered: () => void }) {
  const [cancelCode, setCancelCode] = useState<string | null>(null)
  const [notice, setNotice] = useState<ReorderNotice | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [reorderingCode, setReorderingCode] = useState<string | null>(null)
  const toast = useToast()
  const mutation = useReorder()

  const showNotice = (value: ReorderNotice) => {
    setNotice(value)
    setNoticeOpen(true)
  }

  const reorderOrder = (code: string) => {
    if (mutation.isPending) return
    setReorderingCode(code)
    mutation.mutate(code, {
      onSuccess: (result) => {
        if (result.skipped.length === 0) {
          toast.add({ title: `Đã thêm ${result.added} sản phẩm vào giỏ hàng`, data: { tone: "success" } })
          onReordered()
          return
        }
        showNotice({
          title: `Đã thêm ${result.added} sản phẩm vào giỏ hàng`,
          lines: result.skipped.map(
            (item) => `${item.productName} (${item.size}, ${item.color}): ${REORDER_REASON_LABEL[item.reason]}`,
          ),
          openCartAfter: result.added > 0,
        })
      },
      onError: (error) => {
        if (error.code === "REORDER_NOTHING_ADDED") {
          showNotice({
            title: "Không thêm được sản phẩm nào vào giỏ",
            lines: error.errors.length > 0 ? error.errors.map((item) => item.message) : [error.message],
            openCartAfter: false,
          })
          return
        }
        toast.add({ title: error.message, data: { tone: "danger" } })
      },
      onSettled: () => setReorderingCode(null),
    })
  }

  return {
    cancelCode,
    setCancelCode,
    reorderingCode,
    reorderOrder,
    notice,
    noticeOpen,
    setNoticeOpen,
    /** Gọi khi hộp thoại kết quả đóng xong. */
    onNoticeClosed: () => {
      if (notice?.openCartAfter) onReordered()
    },
  }
}

export type OrderActions = ReturnType<typeof useOrderActions>
