import { Download } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { saveQrAsPng } from "../save-qr"

const QR_SIZE = 240

/**
 * Mã QR vẽ từ `qrPayload` ngay trên trình duyệt (không gọi dịch vụ ảnh bên ngoài). Luôn nền trắng, chữ đen kể cả giao diện tối để app ngân hàng quét được.
 * Nút "Lưu ảnh QR" cho người dùng điện thoại: lưu rồi chọn từ thư viện ảnh trong app ngân hàng.
 */
function PaymentQr({ payload, orderCode }: { payload: string; orderCode: string }) {
  const box = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const save = async () => {
    const svg = box.current?.querySelector("svg")
    const ok = svg ? await saveQrAsPng(svg, `qr-${orderCode}.png`) : false
    if (!ok) toast.add({ title: "Không lưu được ảnh QR, hãy chụp màn hình", data: { tone: "danger" } })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={box} className="rounded-card border border-border-subtle bg-white p-3">
        <QRCodeSVG
          value={payload}
          size={QR_SIZE}
          level="M"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#000000"
          title="Mã QR chuyển khoản"
        />
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={() => void save()} className="press rounded-4xl">
        <Download aria-hidden="true" />
        Lưu ảnh QR
      </Button>
    </div>
  )
}

export { PaymentQr }
