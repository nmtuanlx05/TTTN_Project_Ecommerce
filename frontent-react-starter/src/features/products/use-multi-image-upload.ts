import { useEffect, useRef, useState } from "react"
import { ApiError } from "@/lib/api-error"
import { validateImageFile } from "@/lib/image-rules"
import { uploadImage } from "@/lib/upload-image"

export interface UploadItem {
  id: number
  file: File
  status: "queued" | "uploading" | "error"
  /** Phần trăm 0–100 của lần tải hiện tại; null khi chưa biết. */
  progress: number | null
  error: string | null
  /** Lỗi do file (quá lớn, sai loại) thì thử lại vô ích: chỉ cho bỏ qua. */
  retryable: boolean
}

const NAMES_SHOWN = 3

function overflowNotice(room: number, names: string[]) {
  const shown = names.slice(0, NAMES_SHOWN).join(", ")
  const more = names.length > NAMES_SHOWN ? ` và ${names.length - NAMES_SHOWN} ảnh khác` : ""
  return room > 0
    ? `Chỉ còn chỗ cho ${room} ảnh nên đã bỏ qua: ${shown}${more}.`
    : `Đã đủ số ảnh tối đa nên đã bỏ qua: ${shown}${more}. Xóa bớt ảnh rồi thêm lại.`
}

/**
 * Hàng đợi tải NHIỀU ảnh sản phẩm lên `POST /uploads/products`, mỗi file một request và lần lượt từng file (không song song).
 * Kiểm tra file phía client ngay khi chọn (loại, dung lượng); file lỗi thành một mục lỗi riêng, KHÔNG ảnh hưởng ảnh đã có hay các file khác.
 * Lỗi mạng/server thì mục ở lại với nút thử lại. Tải xong thì gọi `onUploaded(url)` và gỡ mục khỏi hàng đợi. Gỡ component thì hủy request đang chạy.
 * Hook không biết danh sách ảnh: nơi gọi truyền số chỗ còn trống (`free`) mỗi lần thêm file.
 */
export function useMultiImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const nextId = useRef(1)
  const running = useRef<{ id: number; abort: AbortController } | null>(null)
  const onUploadedRef = useRef(onUploaded)
  useEffect(() => {
    onUploadedRef.current = onUploaded
  })

  const patch = (id: number, changes: Partial<UploadItem>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  const head = items.find((item) => item.status === "queued")
  const busy = items.some((item) => item.status === "uploading")

  useEffect(() => {
    if (!head || busy || running.current) return
    const abort = new AbortController()
    running.current = { id: head.id, abort }
    patch(head.id, { status: "uploading", progress: null })
    uploadImage("products", head.file, {
      signal: abort.signal,
      onProgress: (progress) => patch(head.id, { progress }),
    })
      .then((url) => {
        setItems((list) => list.filter((item) => item.id !== head.id))
        onUploadedRef.current(url)
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return
        patch(head.id, {
          status: "error",
          error: ApiError.from(error).message,
          retryable: true,
        })
      })
      .finally(() => {
        running.current = null
      })
  }, [head, busy])

  useEffect(() => () => running.current?.abort.abort(), [])

  /**
   * `free`: số ảnh còn thêm được (đã trừ ảnh có sẵn và các mục đang chờ tải).
   * File sai loại/quá lớn luôn thành mục lỗi riêng và KHÔNG chiếm chỗ; file hợp lệ nhận theo thứ tự cho tới khi hết chỗ,
   * phần còn lại bị bỏ và thông báo nêu tên từng file.
   */
  function addFiles(files: File[], free: number) {
    setNotice(null)
    const checked = files.map((file) => ({ file, problem: validateImageFile(file, "products") }))
    const room = Math.max(free, 0)
    let taken = 0
    const dropped: string[] = []
    const added = checked.flatMap(({ file, problem }): UploadItem[] => {
      if (!problem) {
        if (taken >= room) {
          dropped.push(file.name)
          return []
        }
        taken += 1
      }
      return [
        {
          id: nextId.current++,
          file,
          status: problem ? "error" : "queued",
          progress: null,
          error: problem,
          retryable: false,
        },
      ]
    })
    if (dropped.length > 0) setNotice(overflowNotice(room, dropped))
    setItems((list) => [...list, ...added])
  }

  function retry(id: number) {
    patch(id, { status: "queued", error: null })
  }

  /** Bỏ một mục: đang tải thì hủy request; chờ hoặc lỗi thì gỡ khỏi danh sách. */
  function dismiss(id: number) {
    if (running.current?.id === id) running.current.abort.abort()
    setItems((list) => list.filter((item) => item.id !== id))
  }

  return {
    items,
    notice,
    pending: items.filter((item) => item.status !== "error").length,
    addFiles,
    retry,
    dismiss,
  }
}
