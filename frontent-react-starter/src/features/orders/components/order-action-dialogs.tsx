import { useState } from "react"
import { StorefrontDialog } from "@/components/storefront/storefront-dialog"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_CANCEL_REASON, MAX_REASON_LENGTH } from "../constants"
import type { OrderActions } from "../use-order-actions"
import { useCancelOrder } from "../queries"

/** Form trong hộp thoại hủy; được dựng lại mỗi lần mở nên ô lý do luôn về mặc định. */
function CancelForm({ code, awaitingPayment, onClose }: { code: string; awaitingPayment: boolean; onClose: () => void }) {
  const [reason, setReason] = useState(DEFAULT_CANCEL_REASON)
  const cancel = useCancelOrder()
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        cancel.mutate({ code, reason: reason.trim() || DEFAULT_CANCEL_REASON }, { onSettled: onClose })
      }}
      className="flex flex-col gap-4 p-gutter"
    >
      {awaitingPayment ? (
        <Alert variant="warning" title="Bạn đã chuyển khoản chưa?">
          Nếu đã chuyển khoản, đừng hủy đơn: hãy chờ hệ thống xác nhận hoặc liên hệ cửa hàng kèm mã đơn. Hủy đơn sau khi chuyển khoản có thể
          khiến tiền phải hoàn lại thủ công.
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="cancel-reason" className="text-body-sm font-medium text-ink">
          Lý do hủy (không bắt buộc)
        </label>
        <Textarea
          id="cancel-reason"
          value={reason}
          maxLength={MAX_REASON_LENGTH}
          onChange={(event) => setReason(event.target.value)}
          disabled={cancel.isPending}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={cancel.isPending} onClick={onClose} className="press">
          Giữ đơn hàng
        </Button>
        <Button type="submit" variant="destructive" loading={cancel.isPending} className="press">
          Hủy đơn
        </Button>
      </div>
    </form>
  )
}

/** Hộp thoại xác nhận hủy đơn và hộp thoại kết quả mua lại (liệt kê dòng bị bỏ qua kèm lý do). */
function OrderActionDialogs({ actions }: { actions: OrderActions }) {
  const { cancelTarget, closeCancel, notice, noticeOpen, setNoticeOpen, onNoticeClosed } = actions
  return (
    <>
      <StorefrontDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => (open ? undefined : closeCancel())}
        title="Hủy đơn hàng?"
        description={cancelTarget ? `Đơn ${cancelTarget.code} sẽ bị hủy và không thể khôi phục.` : undefined}
      >
        {cancelTarget ? (
          <CancelForm code={cancelTarget.code} awaitingPayment={cancelTarget.awaitingPayment} onClose={closeCancel} />
        ) : null}
      </StorefrontDialog>
      <StorefrontDialog
        open={noticeOpen}
        onOpenChange={setNoticeOpen}
        title={notice?.title ?? ""}
        description="Một số sản phẩm không thêm được hoặc chỉ thêm một phần:"
        onOpenChangeComplete={(open) => (open ? undefined : onNoticeClosed())}
      >
        <ul className="flex flex-col gap-2 px-gutter pt-4 text-body-sm text-ink">
          {notice?.lines.map((line) => (
            <li key={line} className="list-inside list-disc">
              {line}
            </li>
          ))}
        </ul>
        <div className="flex justify-end p-gutter">
          <Button type="button" onClick={() => setNoticeOpen(false)} className="press">
            {notice?.openCartAfter ? "Xem giỏ hàng" : "Đã hiểu"}
          </Button>
        </div>
      </StorefrontDialog>
    </>
  )
}

export { OrderActionDialogs }
