import { useEffect, useState, type FormEvent } from "react"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useUpdateAvatar } from "@/hooks/use-update-avatar"
import type { ApiError } from "@/lib/api-error"
import type { User } from "@/types/user"
import { AvatarInitials } from "./avatar-initials"
import { FormDialogBody, FormDialogFooter } from "./form-dialog"
import { ImageUploadField } from "./image-upload-field"

/** 400 nghĩa là ảnh bị từ chối (không phải ảnh đại diện do chính mình tải, hoặc đã bị xóa); đổi sang lời người dùng hiểu được. */
const MSG_REJECTED = "Ảnh vừa chọn không dùng được làm ảnh đại diện. Hãy chọn lại ảnh rồi lưu."

function describeError(error: ApiError): string {
  return error.statusCode === 400 ? MSG_REJECTED : error.message
}

/** Ảnh đang chọn: `url` để hiển thị; `assetId` chỉ có khi ảnh vừa tải lên trong hộp thoại này (ảnh hiện tại và ảnh đã xóa thì `null`). */
interface AvatarDraft {
  url: string | null
  assetId: number | null
}

/**
 * Ruột hộp thoại đổi ảnh đại diện. Ảnh được tải lên ngay khi chọn nhưng CHƯA gắn vào tài khoản: `draft` giữ ảnh
 * đang chọn (kèm `assetId`) và chỉ khi bấm Lưu mới gọi `PATCH /users/me/avatar` với `{ assetId }`, hoặc `{ avatarUrl: null }` nếu xóa ảnh. Lưu lỗi thì `draft` và hộp thoại giữ nguyên,
 * avatar hiện tại chưa đổi.
 *
 * Chỉ mount khi hộp thoại mở nên `draft` và lỗi tự reset mỗi lần mở lại.
 */
function AvatarForm({
  name,
  email,
  avatarUrl,
  onSaved,
  onClose,
  onBusyChange,
}: {
  name: string | null
  email: string
  /** Avatar hiện tại, mốc để biết có thay đổi hay không. */
  avatarUrl: string | null
  onSaved: (user: User) => void
  onClose: () => void
  /** Để vỏ hộp thoại không cho đóng trong lúc đang lưu. */
  onBusyChange: (busy: boolean) => void
}) {
  const toast = useToast()
  const [draft, setDraft] = useState<AvatarDraft>({ url: avatarUrl, assetId: null })
  const [uploading, setUploading] = useState(false)
  const update = useUpdateAvatar({ onUpdated: onSaved })
  const canSave = draft.url !== avatarUrl && !uploading && !update.isPending

  useEffect(() => {
    onBusyChange(update.isPending)
  }, [update.isPending, onBusyChange])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return
    // Ảnh mới luôn đến từ lần tải lên vừa rồi nên có assetId; không có thì không có gì để gắn.
    const change = draft.url === null ? { avatarUrl: null } : draft.assetId !== null ? { assetId: draft.assetId } : null
    if (!change) return
    update.mutate(change, {
      onSuccess: () => {
        onClose()
        toast.add({
          title: draft.url ? "Đã cập nhật ảnh đại diện" : "Đã xóa ảnh đại diện",
          data: { tone: "success" },
        })
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <FormDialogBody>
        <ImageUploadField
          label="Ảnh đại diện"
          kind="avatars"
          shape="circle"
          value={draft.url}
          disabled={update.isPending}
          // Hộp thoại đã là lớp nổi; xem ảnh lớn sẽ lồng thêm một hộp thoại nữa.
          zoomable={false}
          fallback={<AvatarInitials name={name} email={email} decorative className="text-h2" />}
          onUploadingChange={setUploading}
          onChange={(url, uploaded) => {
            update.reset()
            setDraft({ url, assetId: uploaded?.assetId ?? null })
          }}
        />
        {update.error ? <Alert variant="danger">{describeError(update.error)}</Alert> : null}
      </FormDialogBody>
      <FormDialogFooter>
        <Button type="button" variant="secondary" disabled={update.isPending} onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button type="submit" loading={update.isPending} disabled={!canSave}>
          Lưu
        </Button>
      </FormDialogFooter>
    </form>
  )
}

export { AvatarForm }
