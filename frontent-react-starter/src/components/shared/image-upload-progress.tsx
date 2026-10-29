/**
 * Tiến độ gửi file. `progress` là `null` khi trình duyệt chưa báo được tổng dung lượng. Đạt 100% nghĩa là
 * file đã gửi xong, server còn kiểm tra và lưu nên chuyển sang "Đang xử lý ảnh…".
 */
function ImageUploadProgress({ progress }: { progress: number | null }) {
  return (
    <div className="flex flex-col gap-1">
      {progress !== null ? (
        <div
          role="progressbar"
          aria-label="Tiến độ tải ảnh lên"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-sunken"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <p className="text-caption text-ink-muted" data-numeric>
        {progress === null
          ? "Đang tải lên…"
          : progress < 100
            ? `Đang tải lên… ${progress}%`
            : "Đang xử lý ảnh…"}
      </p>
    </div>
  )
}

export { ImageUploadProgress }
