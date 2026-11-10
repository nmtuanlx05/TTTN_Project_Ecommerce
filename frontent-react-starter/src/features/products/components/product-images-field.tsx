import { useEffect, useRef } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import type { UploadedImage } from "@/types/upload"
import { MAX_PRODUCT_IMAGES } from "../constants"
import type { ProductFormValues } from "../schemas"
import { useMultiImageUpload } from "../use-multi-image-upload"
import { ProductImageDropzone } from "./product-image-dropzone"
import { ProductImageItem } from "./product-image-item"
import { ProductImageUrlInput } from "./product-image-url-input"
import { ProductUploadItem } from "./product-upload-item"

/**
 * Ảnh sản phẩm (tối đa 6): kéo-thả hoặc chọn nhiều file (`ProductImageDropzone`; hàng đợi lần lượt, mỗi file một request) hoặc thêm bằng URL. Ảnh đầu là ảnh đại diện;
 * đổi thứ tự bằng nút lên/xuống (KHÔNG kéo-thả để sắp xếp), xóa từng ảnh. Danh sách nằm trong trường `images` của form, nên lỗi một lần tải không làm mất ảnh đã có. Form khóa nút Lưu khi còn file đang chờ/tải.
 */
function ProductImagesField({
  id,
  onUploadingChange,
}: {
  id: string
  onUploadingChange: (uploading: boolean) => void
}) {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const images = useWatch({ control, name: "images" })
  const listRef = useRef<HTMLUListElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)

  const write = (next: ProductFormValues["images"]) =>
    setValue("images", next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  /** Thêm ảnh vào cuối danh sách. Ảnh vừa tải lên (có `image`) mang `assetId` để gửi `{ assetId }`; ảnh dán URL thì chỉ có `url`. */
  const append = (url: string, image?: UploadedImage) => {
    const current = getValues("images")
    if (current.length < MAX_PRODUCT_IMAGES && !current.some((item) => item.url === url)) {
      write([...current, image ? { url, assetId: image.assetId } : { url }])
    }
  }

  const upload = useMultiImageUpload({ onUploaded: append })
  const free = MAX_PRODUCT_IMAGES - images.length - upload.pending
  const error = errors.images?.message ?? errors.images?.root?.message
  useEffect(() => onUploadingChange(upload.pending > 0), [upload.pending, onUploadingChange])

  function move(index: number, direction: -1 | 1) {
    const next = [...images]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    write(next)
    const target = index + direction
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector(`[data-pos="${target}"]`)
      const [same, other] = direction === -1 ? ["up", "down"] : ["down", "up"]
      const button =
        row?.querySelector<HTMLButtonElement>(`[data-act="${same}"]:not(:disabled)`) ??
        row?.querySelector<HTMLButtonElement>(`[data-act="${other}"]:not(:disabled)`)
      button?.focus()
    })
  }

  return (
    <div className="flex flex-col gap-stack">
      <ProductImageDropzone
        count={images.length}
        free={free}
        empty={images.length === 0 && upload.items.length === 0}
        onFiles={(files) => upload.addFiles(files, free)}
        buttonRef={addRef}
      />

      {error ? (
        <p role="alert" className="text-body-sm text-danger-fg">
          {error}
        </p>
      ) : null}
      {upload.notice ? (
        <p role="status" className="text-body-sm text-ink-muted">
          {upload.notice}
        </p>
      ) : null}

      {images.length > 0 || upload.items.length > 0 ? (
        <ul ref={listRef} className="flex flex-col gap-2">
          {images.map((image, index) => (
            <ProductImageItem
              key={image.url}
              url={image.url}
              index={index}
              total={images.length}
              onMove={(direction) => move(index, direction)}
              onRemove={() => {
                write(images.filter((_, position) => position !== index))
                // Nút thêm có thể đang bị vô hiệu vì đủ 6 ảnh: chờ dựng lại rồi mới focus.
                requestAnimationFrame(() => addRef.current?.focus())
              }}
            />
          ))}
          {upload.items.map((item) => (
            <ProductUploadItem
              key={item.id}
              item={item}
              onRetry={() => upload.retry(item.id)}
              onDismiss={() => upload.dismiss(item.id)}
            />
          ))}
        </ul>
      ) : null}

      <ProductImageUrlInput
        id={`${id}-url`}
        existing={images.map((image) => image.url)}
        disabled={free <= 0}
        onAdd={(url) => append(url)}
      />
    </div>
  )
}

export { ProductImagesField }
