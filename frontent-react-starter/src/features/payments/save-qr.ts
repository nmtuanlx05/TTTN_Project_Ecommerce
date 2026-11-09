/** Lưu mã QR (phần tử `<svg>`) thành ảnh PNG 1024px nền trắng để khách chọn từ thư viện ảnh trong app ngân hàng. Trả `false` nếu không dựng được ảnh. */
export async function saveQrAsPng(svg: SVGSVGElement, fileName: string): Promise<boolean> {
  const size = 1024
  const xml = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("Không đọc được ảnh QR"))
      image.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext("2d")
    if (!context) return false
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, size, size)
    context.drawImage(image, 0, 0, size, size)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    if (!blob) return false
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000)
    return true
  } catch {
    return false
  } finally {
    URL.revokeObjectURL(url)
  }
}
