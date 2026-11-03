import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import type { StoreLocation } from "@/lib/store-info"
import { StateMessage } from "./state-message"
import { StoreEntry } from "./store-entry"

/** Danh sách cửa hàng. Chưa có cửa hàng nào (`STORE.stores` rỗng) thì hiện trạng thái rỗng, không bịa địa chỉ. */
function StoreList({ stores }: { stores: StoreLocation[] }) {
  if (stores.length === 0) {
    return (
      <StateMessage
        icon={MapPin}
        title="Thông tin cửa hàng đang được cập nhật"
        description="Địa chỉ các cửa hàng sẽ hiện ở đây. Trong lúc chờ, bạn có thể xem sản phẩm trực tuyến."
        action={
          <Link to="/products" className={buttonVariants({ variant: "secondary" })}>
            Xem sản phẩm
          </Link>
        }
      />
    )
  }

  return (
    <div>
      {stores.map((store) => (
        <StoreEntry key={`${store.name}-${store.address}`} store={store} />
      ))}
    </div>
  )
}

export { StoreList }
