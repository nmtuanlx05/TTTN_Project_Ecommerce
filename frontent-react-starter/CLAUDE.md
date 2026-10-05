# CLAUDE.md — Frontend

File này ghi lại các quyết định thiết kế đã chốt cho giao diện web. Đọc trước khi
viết bất kỳ component nào.

Backend NestJS nằm ở thư mục song song `backend-nestjst-starter`, có CLAUDE.md
riêng. Tài liệu nghiệp vụ và schema dữ liệu ở `backend-nestjst-starter/docs/`.

## Luật bắt buộc

> **Mọi màu, cỡ chữ, khoảng cách phải lấy từ token. Cấm hardcode mã màu hoặc
> giá trị px rời rạc trong component.**

Cụ thể, trong `src/components/**` và `src/pages/**`:

- Cấm `#rrggbb`, `rgb()`, `oklch()`, `hsl()` viết thẳng.
- Cấm class màu dựng sẵn của Tailwind (`text-gray-500`, `bg-zinc-100`,
  `border-neutral-200`…). Chỉ dùng token ngữ nghĩa: `text-ink-muted`,
  `bg-surface-sunken`, `border-border-subtle`.
- Cấm `text-[13px]`, `p-[18px]`, `gap-[7px]`. Dùng thang chữ (`text-body-sm`)
  và thang khoảng cách theo mật độ (`p-card`, `gap-stack`, `py-row`).
- Token mới phải khai báo trong `src/global.css` và đặt tên theo **ngữ nghĩa**
  (`--color-border-subtle`, `--color-status-shipping-bg`), không theo sắc độ
  (`--color-gray-200`).

Ngoại lệ duy nhất: trang `/styleguide` được phép dùng `style={{ background: hex }}`
để *trình bày* ô màu, vì đó là nội dung của trang chứ không phải giao diện.

## Lệnh

```
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint .
```

Cả `npx tsc -b` lẫn `npm run lint` hiện đang sạch — giữ nguyên như vậy.

## Font

| Vai trò | Font | Biến | Ghi chú |
|---|---|---|---|
| Display | Archivo Variable (`wght` 100–900, `wdth` 62–125) | `--font-display` | Dùng cho h1–h4 và `.font-display` |
| Body | Be Vietnam Pro (400/500/600/700) | `--font-sans` | Mặc định của `body` |
| Số liệu | Geist Mono Variable | `--font-mono` | SKU, mã đơn, tiền |

Cả ba đều có bộ dấu tiếng Việt đầy đủ (đã kiểm chứng trong file woff2 của
package, không phải phỏng đoán). Be Vietnam Pro do xưởng chữ Việt Nam vẽ, dấu
được thiết kế riêng cho từng ký tự nền thay vì ghép tự động.

Geist (font mặc định của starter shadcn) **có** đủ dấu tiếng Việt nhưng đã bị
thay vì nó không có giọng display và là font mặc định của mọi trang shadcn.

### Quy tắc cho tiêu đề in hoa

Dấu mũ chồng dấu thanh (`Ư` + huyền, `Ổ`) chiếm thêm ~20% chiều cao phía trên
so với chữ hoa không dấu. Vì vậy:

- `line-height` của mọi cấp heading **không bao giờ dưới 1.15**.
- Archivo dùng `font-stretch: 90%` (`--stretch-display`). **Không nén dưới 85%** —
  dưới mức đó dấu bắt đầu chồng lấn.
- `letter-spacing` của chữ in hoa giữ ở `-0.01em`, không chặt hơn.
- Chuỗi kiểm chứng khi đổi font hoặc đổi thang chữ:
  `ĐƠN HÀNG ĐÃ GIAO — ƯU ĐÃI — KIỂM KÊ KHO — TỔNG CỘNG`
  Trang `/styleguide` in sẵn chuỗi này ở cỡ lớn nhất và nhỏ nhất.

Để số tiền và mã đơn thẳng cột, đặt `data-numeric` lên phần tử — nó tự nhận
font mono và `tabular-nums`.

## Màu

Nền giấy gần trung tính (`#F2F1EE`), chữ gần đen ấm (`#171614`), gần như đơn
sắc. Màu dành hết cho ảnh sản phẩm. Phân tách bằng hairline 1px, không đổ bóng,
không gradient, góc bo rất nhẹ.

Toàn bộ dựng trong OKLCH rồi xuất hex, nên các bậc sáng đều về mặt cảm nhận.

### Nền tảng

| Token | Light | Dark |
|---|---|---|
| `--color-canvas` | `#F2F1EE` | `#11100E` |
| `--color-surface` | `#FAF9F7` | `#1C1B19` |
| `--color-surface-raised` | `#FFFFFF` | `#262422` |
| `--color-surface-sunken` | `#E5E4E0` | `#090907` |
| `--color-ink` | `#171614` | `#EEEDE9` |
| `--color-ink-muted` | `#5D5A58` | `#AEACA8` |
| `--color-ink-subtle` | `#6C6A67` | `#959390` |
| `--color-border-subtle` | `#E0DEDB` | `#2C2B28` |
| `--color-border-default` | `#CFCDC9` | `#3B3A37` |
| `--color-border-strong` | `#A09E9A` | `#5F5D59` |
| `--color-border-control` | `#7C7A77` | `#767370` |
| `--color-primary` | `#171614` | `#EEEDE9` |

Dark mode không phải đảo ngược máy móc: nền là đen ngà chứ không đen tuyền, chữ
là trắng ngà chứ không trắng tinh, và màu trạng thái được chỉnh lại độ sáng
riêng chứ không lật.

### Hai quy tắc tương phản phải nhớ

1. **Trên `surface-sunken` (header bảng, sidebar admin) cấm dùng `ink-subtle`.**
   Cặp đó chỉ đạt 4.24, dưới ngưỡng AA. Dùng `ink-muted` (5.38).
2. **Viền của control phải là `border-control`, không phải `border-default`.**
   `border-default` chỉ đạt 1.41 — nó là đường kẻ trang trí. `border-control`
   đạt 3.79, thỏa WCAG 1.4.11 cho ranh giới input/checkbox/radio.

Mọi cặp chữ/nền khác trong hệ thống đều ≥ 4.5. Bảng đầy đủ nằm ở `/styleguide`.

### Trạng thái đơn hàng

Nguyên tắc: **độ đậm của mực tăng dần theo tiến độ đơn hàng.** Yêu cầu "phân
biệt được khi in đen trắng" buộc 7 badge phải trải rộng thang sáng, không thể
nhét hết vào vùng pastel. Bậc xám giữa các badge liền kề ở light mode:
1.22 → 1.28 → 1.30 → 2.20 → 1.73.

Hai nhánh phụ tách khỏi thang bằng **hình thức** chứ không chỉ bằng tông:
`CANCELLED` là badge **rỗng, chỉ có viền** — không có gì xảy ra thì không có
mực. Trong bản in, badge rỗng không thể nhầm với badge có nền. `UNPAID` dùng
cùng hình thức rỗng ở cột thanh toán.

Dark mode giữ đúng hướng thang nhưng bậc hẹp hơn (1.05–1.12), vì ở vùng tối mọi
màu dồn về gần đen. Chấp nhận được: không ai in trang ở dark mode.

Dùng `<OrderStatusBadge status="SHIPPING" />` và
`<PaymentStatusBadge status="PAID" />` — hai component này tự tra nhãn tiếng
Việt và biến thể màu từ enum của Prisma. **Không tự viết badge trạng thái mới.**

Nhãn tiếng Việt đã chốt (`ORDER_STATUS` trong `src/components/ui/badge.tsx`):
Chờ xác nhận · Đã xác nhận · Đang đóng gói · Đang giao · Đã giao · Đã hủy ·
Trả hàng.

## Thang chữ

Chín cấp: `display`, `h1`, `h2`, `h3`, `body-lg`, `body`, `body-sm`, `caption`,
`overline`. Mỗi cấp đã gắn sẵn line-height, letter-spacing và font-weight, nên
`text-h2` là đủ, không cần thêm `leading-*` hay `tracking-*`.

Sàn cỡ chữ: **văn bản chạy không bao giờ nhỏ hơn `body-sm`** (14px storefront,
13px admin). `caption` và `overline` chỉ dùng cho nhãn ngắn và metadata, không
dùng cho câu.

## Hai bộ mật độ

Dùng **class scope** `.density-admin`, không phải bộ token song song
`--spacing-admin-*`.

Lý do: component không cần biết nó đang nằm ở khu vực nào. Nó luôn đọc
`--fs-body` / `--sp-row`; vỏ ngoài quyết định giá trị. Nếu tách tên token thì
mỗi component phải có hai biến thể, và mọi component mới đều phải nhớ làm cả
hai — đó là chỗ hệ thống bắt đầu lệch nhau. Cùng một `<Table>` đặt trong
`.density-admin` sẽ tự thắt lại.

| Biến | Storefront | Admin |
|---|---|---|
| `--sp-gutter` | 24px | 16px |
| `--sp-section` | 80px | 32px |
| `--sp-card` | 24px | 16px |
| `--sp-row` | 16px | 8px |
| `--sp-stack` | 16px | 10px |
| `--sp-inline` | 12px | 8px |
| `--sp-control-h` | 44px | 36px |
| `body` | 16px | 14px |

Tiện ích Tailwind tương ứng: `px-gutter`, `gap-section`, `p-card`, `py-row`,
`gap-stack`, `gap-inline`, `h-control`, `size-control`.

Dưới 768px, `.density-admin` tự nới `--sp-control-h` về 44px để giữ vùng bấm,
dù mật độ chữ vẫn dày.

## Bo góc và viền

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--radius-control` | 2px | input, nút, checkbox |
| `--radius-surface` | 3px | card, dialog, bảng |
| `--radius-pill` | 999px | badge, chip |

Độ dày viền luôn là 1px (`--stroke-hairline`). Focus ring là 2px, cách mép 2px.

## Nút

Bốn cấp, vẫn đơn sắc:

| Cấp | Hình thức | Khi nào dùng |
|---|---|---|
| `primary` | nền mực đặc, chữ ngà | **Một nút duy nhất mỗi màn** (Thêm vào giỏ, Đặt hàng, Lưu) |
| `secondary` | viền 1px, nền trong suốt | Hành động phụ |
| `ghost` | không viền, chỉ đổi nền khi hover | Hành động nhẹ, trong bảng/thanh công cụ |
| `destructive` | nền danger | Chỉ cho xóa/hủy |

Mọi nút đã có đủ default, hover, active, focus-visible, disabled và loading.
`loading` giữ nguyên chỗ của nhãn để nút không nhảy khi đang xử lý.

`default` và `outline` là tên cũ của shadcn, giữ lại cho component sinh sẵn —
code mới dùng `primary` / `secondary`.

## Sáng / tối

- `src/hooks/use-theme.ts` — lưu `"light" | "dark" | "system"` vào localStorage,
  mặc định `system`. `resolved` được tính trong lúc render, không giữ thành
  state riêng, nên không có vòng render thừa.
- `index.html` có script nhỏ đặt class `dark` lên `<html>` **trước khi React
  mount** → không nhấp nháy khi tải trang. Nếu đổi key localStorage thì phải
  sửa cả script này.
- `<ThemeToggle />` — ba trạng thái, dựng bằng `radiogroup`, đi được bằng mũi tên.

## Tiếp cận

- Mọi thành phần phải dùng được bằng bàn phím. Focus ring 2px, cách mép 2px,
  nhìn rõ ở cả hai chế độ. Không bao giờ `outline: none` mà không thay bằng
  thứ khác nhìn thấy được.
- Vùng bấm tối thiểu 44×44px trên mobile. Checkbox giữ ô vuông 20px nhưng nới
  vùng bấm bằng `::before` dưới 768px.
- `prefers-reduced-motion` đã được tôn trọng ở `@layer base`.
- Báo lỗi form phải nói **sai ở đâu và sửa thế nào**, không chỉ "Không hợp lệ".
  Màn hình rỗng là lời mời hành động, không phải lời xin lỗi.

## Định dạng

Dùng `src/lib/format.ts`, không tự gọi `Intl` rải rác:

- `formatVnd(1290000)` → tiền VND, số nguyên, không phần thập phân.
- `formatDateTime(value)` → luôn theo **GMT+7** (`Asia/Ho_Chi_Minh`), bất kể
  múi giờ máy người dùng.

Giao diện viết bằng tiếng Việt. Tên biến, hàm, file, commit message bằng tiếng Anh.

## Thư viện

Đã có, **không cài thêm thư viện UI nào khác**:

- shadcn/ui style `base-nova` → các component dựng trên `@base-ui/react`
  (không phải Radix). Khi tra tài liệu, tra Base UI.
- `lucide-react` cho icon.
- `react-hook-form` + `zod` + `@hookform/resolvers` cho form.
- `@tanstack/react-table` **v9** — API khác hẳn v8: dùng `useTable` +
  `tableFeatures({...})` chứ không phải `useReactTable` + `getCoreRowModel()`.
  Xem `src/pages/styleguide/index.tsx` làm mẫu.
- Toast dùng `@base-ui/react/toast` qua `src/components/ui/toast.tsx`.
  `react-toastify` còn trong `package.json` nhưng **không dùng** — nó không đọc
  token của ta.

`src/components/ui/**` là thư mục do `shadcn add` sinh ra và có thể bị ghi đè.
Quy tắc `react-refresh/only-export-components` đã được tắt riêng cho thư mục này
trong `eslint.config.js` vì quy ước của shadcn là xuất biến thể cạnh component.

## Trang hiện có

- `/styleguide` — trình bày toàn bộ hệ thống. Mọi route khác hiện redirect về đây.

Khi thêm trang nghiệp vụ: đọc `backend-nestjst-starter/docs/` trước, mỗi lần làm
một module, và cập nhật `/styleguide` nếu có thêm token hoặc component dùng chung.
