# CLAUDE.md — Frontend

File này ghi lại các quyết định thiết kế đã chốt cho giao diện web. Đọc trước khi
viết bất kỳ component nào.

Backend NestJS nằm ở thư mục song song `backend-nestjst-starter`, có CLAUDE.md
riêng. Tài liệu nghiệp vụ và schema dữ liệu ở `backend-nestjst-starter/docs/`.

Quy ước Git (commit, nhánh, merge) dùng chung với backend: xem mục "Git" trong `backend-nestjst-starter/CLAUDE.md` và `backend-nestjst-starter/docs/git-workflow.md`.
Một tính năng = một nhánh `feat/<tên-tính-năng>` chứa cả backend và frontend (một push, một PR, merge commit); frontend đọc
`backend-nestjst-starter/docs/api/` trực tiếp từ working tree, không chờ backend merge. Commit backend trước, frontend sau
(docs → hạ tầng/component dùng chung → tính năng). Khi đề xuất commit: mỗi file đúng một commit, mỗi commit build được độc lập,
không `git add -p`/`-N`, ghi rõ `cd` vào thư mục, nhiều tham số `-m`, cuối cùng `git status` phải sạch; chỉ đề xuất add file
của phần mình và nhắc chạy `git restore --staged :/` nếu đang có file staged từ phần khác.

## Cấu trúc thư mục (bắt buộc)
- Chi tiết: `docs/cau-truc-thu-muc.md`. ĐỌC khi tạo module hoặc trang mới, hoặc khi không chắc đặt file ở đâu. Sửa nhỏ thì không cần đọc.
- Hai giao diện: storefront (khách) ở `/`, admin (ADMIN và STAFF dùng chung) ở `/admin`. Không làm trang staff riêng.
- Luật ngắn: pages chỉ ghép (không gọi API, không logic); thứ riêng của tính năng nằm trong `features/<tên>/`; features không import lẫn nhau; mỗi file một component dưới ~150 dòng; chỉ `api.ts` và `lib/api-client.ts` dùng axios; không sửa `components/ui/` (ngoại lệ đã cho phép: THÊM lớp `soft:` vào variant của `ui/button.tsx`, không đổi hành vi variant hiện có; sửa kiểu này phải một commit riêng và chứng minh admin không đổi).
- Tạo module mới: làm theo mục "Checklist module mới" trong docs. Việc cần làm → file cần mở (sửa chữ trang chủ, hero, thẻ sản phẩm, footer...): mục 10 "Bản chỉ đường storefront"; tạo file mới hay gộp: mục 11 "Khi nào tạo file mới, khi nào gộp".
- Làm giao diện khách (storefront): đọc `docs/storefront-design.md` (ý tưởng, token dùng cho từng vai trò, thang chữ, lưới, chuyển động, ảnh, trạng thái, truy cập).
- Đổi cấu trúc thì sửa file docs trước.

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
| Serif nghiêng | Newsreader Variable, italic thật (OFL-1.1, ghim `5.3.0`) | `--font-serif` | Trang chủ: nhãn đầu khối, phụ đề hero, dải "Câu chuyện thương hiệu"; nạp tay hai tập latin + vietnamese (~77 kB, preload trong `index.html`), không dùng chỗ khác |

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

Website **chỉ có giao diện sáng** (cột Light). Cột "Vùng tối cố định" là bộ token của class `dark`
(`.dark` trong `global.css`), chỉ có tác dụng bên trong 5 vùng tối cố định: thanh thông báo, chân trang,
dải câu chuyện thương hiệu, thẻ danh mục nổi bật và lightbox xem ảnh (xem mục "Giao diện sáng và vùng tối cố định").

| Token | Light | Vùng tối cố định |
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

Bộ token vùng tối cố định không phải đảo ngược máy móc: nền là đen ngà chứ không đen tuyền, chữ
là trắng ngà chứ không trắng tinh, và màu trạng thái được chỉnh lại độ sáng
riêng chứ không lật.

### Ba quy tắc tương phản phải nhớ

1. **Trên `surface-sunken` (header bảng, sidebar admin) cấm dùng `ink-subtle`.**
   Cặp đó chỉ đạt 4.24, dưới ngưỡng AA. Dùng `ink-muted` (5.38).
2. **Viền của control phải là `border-control`, không phải `border-default`.**
   `border-default` chỉ đạt 1.41 — nó là đường kẻ trang trí. `border-control`
   đạt 3.79, thỏa WCAG 1.4.11 cho ranh giới input/checkbox/radio.

3. **Nền hover phải khác nền của vùng nó nằm trên.** Popup, dropdown, dialog dùng
   `surface-raised`; bộ token vùng tối từng đặt `surface-hover` trùng đúng màu đó nên mục
   đang hover không đổi gì. Hiện hover/raised ở vùng tối là 1.27 (light là 1.21). Chữ
   `ink-subtle` không dùng trên nền hover (vùng tối chỉ 3.99).

Mọi cặp chữ/nền khác trong hệ thống đều ≥ 4.5. Bảng đầy đủ nằm ở `/styleguide`.

### Trạng thái đơn hàng

Nguyên tắc: **độ đậm của mực tăng dần theo tiến độ đơn hàng.** Yêu cầu "phân
biệt được khi in đen trắng" buộc 6 badge phải trải rộng thang sáng, không thể
nhét hết vào vùng pastel. Bậc xám giữa các badge liền kề ở giao diện sáng
(PENDING → CONFIRMED → SHIPPING → RETURNED → COMPLETED): 1.22 → 1.66 → 2.20 → 1.73. Luồng đơn không còn `PACKING`
(PENDING → CONFIRMED → SHIPPING → COMPLETED, cộng CANCELLED/RETURNED/PENDING_PAYMENT).

Hai nhánh phụ tách khỏi thang bằng **hình thức** chứ không chỉ bằng tông:
`CANCELLED` là badge **rỗng, chỉ có viền** — không có gì xảy ra thì không có
mực. Trong bản in, badge rỗng không thể nhầm với badge có nền. `UNPAID` dùng
cùng hình thức rỗng ở cột thanh toán.

Bộ token vùng tối giữ đúng hướng thang nhưng bậc hẹp hơn (1.05–1.12), vì ở vùng tối mọi
màu dồn về gần đen. Chấp nhận được: badge trạng thái chỉ hiện trên nền sáng của admin, không nằm trong vùng tối nào.

Dùng `<OrderStatusBadge status="SHIPPING" />` và
`<PaymentStatusBadge status="PAID" />` — hai component này tự tra nhãn tiếng
Việt và biến thể màu từ enum của Prisma. **Không tự viết badge trạng thái mới.**

Nhãn tiếng Việt đã chốt (`ORDER_STATUS` trong `src/components/ui/badge.tsx`):
Chờ xác nhận · Đã xác nhận · Đang giao · Đã giao · Đã hủy ·
Trả hàng.

**Hai nơi hiển thị, hai component** (chủ đích, không gộp):
- **Admin** dùng `OrderStatusBadge` (`components/ui/badge.tsx`): thang mực ở trên.
- **Storefront** ("Đơn hàng của tôi") dùng `OrderStatusPill` (`features/orders/components/order-status-pill.tsx`): viên thuốc tông nhạt có chấm màu
  (token `warning/info/success/danger-*` có sẵn), nhãn và nhóm màu ở `features/orders/constants.ts`.
- **Thêm hoặc đổi một trạng thái phải sửa CẢ HAI**: `ORDER_STATUS` ở `badge.tsx` và các bảng `Record<OrderStatus, ...>` ở `features/orders/constants.ts`.
  Bảng đối chiếu nhãn (vd. `COMPLETED` = "Đã giao" ở admin, "Hoàn thành" ở storefront) ở `docs/storefront-design.md` mục 21.

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
| `--radius-control` | 2px (admin, auth, header); **10px** trong `.soft-ui` | input, nút, checkbox |
| `--radius-surface` | 3px; = control trong `.soft-ui` | card, dialog, bảng, popup |
| `--radius-pill` | 999px | badge, chip, nút tròn |
| `rounded-card` | 18px | storefront: ảnh sản phẩm, thẻ danh mục |
| `rounded-panel` | 28px | storefront: ảnh hero, thẻ câu chuyện, thẻ cam kết |

`.soft-ui` (gắn lên `<main>` và `<footer>` của `StorefrontLayout`, KHÔNG lên header, admin, auth) là phạm vi "mềm" của storefront: ghi đè bán kính và bật lớp `soft:` (hover đảo màu của nút). Chi tiết ở `docs/storefront-design.md` mục 5. Độ dày viền luôn là 1px (`--stroke-hairline`). Focus ring là 2px, cách mép 2px.

## Nút

Bốn cấp, vẫn đơn sắc:

| Cấp | Hình thức | Khi nào dùng |
|---|---|---|
| `primary` | nền mực đặc, chữ ngà | **Một nút duy nhất mỗi màn** (Thêm vào giỏ, Đặt hàng, Lưu) |
| `secondary` | viền 1px, nền trong suốt | Hành động phụ |
| `ghost` | không viền, chỉ đổi nền khi hover | Hành động nhẹ, trong bảng/thanh công cụ |
| `destructive` | nền danger | Chỉ cho xóa/hủy |

Trong storefront (`.soft-ui`) nút `primary` và `secondary` hover ĐẢO MÀU (đặc ↔ viền; lớp `soft:` trong `ui/button.tsx`); admin giữ hover cũ. Mọi nút đã có đủ default, hover, active, focus-visible, disabled và loading.
`loading` giữ nguyên chỗ của nhãn để nút không nhảy khi đang xử lý.

`default` và `outline` là tên cũ của shadcn, giữ lại cho component sinh sẵn —
code mới dùng `primary` / `secondary`.

## Giao diện sáng và vùng tối cố định

- Website **chỉ có giao diện sáng**, bất kể hệ điều hành đặt chế độ tối. Không có nút chuyển chế độ, không có hook/provider
  theme, không có script trong `index.html`, không đọc/ghi localStorage cho theme (giá trị `theme` cũ còn trong trình duyệt
  người dùng bị bỏ qua). `:root { color-scheme: light }` trong `global.css` và `<meta name="color-scheme" content="light">`
  giữ ô nhập, thanh cuộn và điều khiển mặc định của trình duyệt ở chế độ sáng. `<html>` không bao giờ có class `dark`.
- Class `dark` (khối `.dark` và `@custom-variant dark` trong `global.css`) nay nghĩa là **vùng tối cố định** (inverse scope):
  đặt lên MỘT phần tử thì mọi token bên trong dùng bộ màu tối (kể cả `ui/Input`, `ui/Button`, `color-scheme: dark`). Hiện có 5 vùng:
  `announcement-bar`, `storefront-footer`, `home/brand-story`, `home/category-card`, `shared/image-lightbox`. Không xóa khối `.dark`
  hay đổi tên class. Không thêm lại chuyển chế độ cho cả trang.
- Các class `dark:` (biến thể Tailwind) nằm NGOÀI 5 vùng tối trên (hiện còn ở `ui/dropdown-menu.tsx`) không còn tác dụng; vô hại, chưa xử lý.

## Tiếp cận

- Mọi thành phần phải dùng được bằng bàn phím. Focus ring 2px, cách mép 2px,
  nhìn rõ trên nền sáng lẫn trong vùng tối cố định. Không bao giờ `outline: none` mà không thay bằng
  thứ khác nhìn thấy được. **Không viết `outline-none` cạnh `focus-visible:outline-*`**: trong Tailwind v4 nó đặt
  `--tw-outline-style: none` nên vòng focus không bao giờ hiện (đã đo); chỉ phần tử nhận focus bằng chương trình (`main`, popup) mới có `outline-none`
  (xem `docs/storefront-design.md` mục 11).
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
- `axios` + `@tanstack/react-query` cho gọi API — xem mục "Quy ước gọi API".
- `react-hook-form` + `zod` + `@hookform/resolvers` cho form.
- `zustand` chỉ cho store phiên đăng nhập (`features/auth/auth-store.ts`); state khác dùng react-query hoặc state cục bộ.
- `@tanstack/react-table` **v9** — API khác hẳn v8: dùng `useTable` +
  `tableFeatures({...})` chứ không phải `useReactTable` + `getCoreRowModel()`.
  Xem `src/pages/styleguide/index.tsx` làm mẫu.
- Toast dùng `@base-ui/react/toast` qua `src/components/ui/toast.tsx`.
  `react-toastify` đã được gỡ khỏi `package.json` (nó không đọc token của ta); không cài lại.

**`cn()` luôn import từ `@/lib/utils`, không import từ gói `"cn"`.** `utils.ts` đọc các
`--text-*` trong `global.css` để khai báo chúng là cỡ chữ; gói `"cn"` trần coi
`text-body-sm` là class màu và xóa nhầm `text-ink`/`text-primary-fg` khi gộp. ESLint
chặn import `"cn"` ngoài `utils.ts`. Nếu đổi tên token `--text-*` thì `utils.ts` ném
lỗi lúc nạp thay vì hỏng âm thầm. `shadcn add` có thể sinh file import `"cn"` — sửa
lại thành `@/lib/utils`, lint sẽ báo.

`src/components/ui/**` là thư mục do `shadcn add` sinh ra và có thể bị ghi đè.
Quy tắc `react-refresh/only-export-components` đã được tắt riêng cho thư mục này
trong `eslint.config.js` vì quy ước của shadcn là xuất biến thể cạnh component.

## Quy ước gọi API

Backend NestJS (`backend-nestjst-starter`). Mọi chi tiết endpoint nằm ở
`backend-nestjst-starter/docs/api/<module>.md` — đọc file đó, không đoán.

**Cấu hình.** `VITE_API_URL` trong `.env` (mẫu ở `.env.example`, dev là
`http://localhost:3000`). Thiếu biến này thì app báo lỗi ngay lúc nạp. Vite chỉ đọc
`.env` lúc khởi động nên sửa xong phải chạy lại `npm run dev`. Backend chỉ cho CORS
origin `http://localhost:5173`, nên dev server phải chạy đúng cổng đó.

**Phân tầng — mỗi tầng một việc:**

| Tầng | File | Việc |
|---|---|---|
| Client | `src/lib/api-client.ts` | Instance axios duy nhất, bóc `{ success, data, meta }`, chuẩn hóa lỗi |
| Lỗi | `src/lib/api-error.ts` | Lớp `ApiError` |
| Kiểu | `src/types/*.ts` | Khớp hợp đồng API (không có `password`) |
| API | `src/features/<module>/api.ts` | Một hàm cho mỗi endpoint, trả dữ liệu đã bóc |
| Hook | `src/features/<module>/queries.ts` | `useXxx` (query) và `useCreateXxx`… (mutation) bọc react-query |
| UI | `src/pages/**`, `src/components/**` | Chỉ gọi hook, không biết axios |

**Luật:**

- **Cấm gọi axios trực tiếp trong component** (và mọi nơi ngoài `api-client.ts`,
  `api-error.ts`, `features/*/api.ts`). ESLint chặn bằng `no-restricted-imports`.
- Hàm trong `api.ts` dùng `apiGet` (đối tượng), `apiGetPage` (danh sách, trả
  `{ items, meta }`), `apiSend` (POST/PATCH/PUT), `apiUpload` (một file multipart, trường `file`). Không tự đọc `response.data.data`.
  **Upload file phải qua `apiUpload`**, không dùng `apiSend`: instance ép `Content-Type: application/json` nên axios sẽ đổi `FormData` thành chuỗi JSON.
  `apiUpload` gỡ header đó (`Content-Type: false`) để trình duyệt tự thêm boundary, đặt timeout 60s và nhận `onProgress`/`signal`; gặp 401 thì interceptor
  gửi lại được vì `FormData` còn nguyên file.
- **Query key** là `['<module>', params]` (vd `['users', params]`); chi tiết là
  `['<module>', 'detail', id]`. Mutation thành công thì `invalidateQueries` theo
  tiền tố `['<module>']`.
- Danh sách dùng `placeholderData: keepPreviousData` để đổi trang/lọc không chớp
  skeleton. Skeleton chỉ cho lần tải đầu (`isPending`).
- `api-client.ts` bật `withCredentials` và là chỗ duy nhất gắn token (`Authorization: Bearer`) và làm
  mới token khi gặp 401 — xem "Quy ước Auth".

**Lỗi.** Mọi lỗi ra khỏi tầng API đều là `ApiError`: `statusCode` (0 = không có phản
hồi: mất mạng, quá thời gian), `message` (tiếng Việt, hiện được cho người dùng),
`errors` và `fieldErrors` (`{ [field]: message }`). Form nhận lỗi 400 thì đẩy
`fieldErrors` vào `setError` của react-hook-form; lỗi khác thì hiện `message` bằng
toast hoặc `Alert`. Lỗi 4xx không được retry.

**Trạng thái danh sách nằm trên URL** (`?q=&role=&page=`…) qua `useSearchParams`, để
F5 và gửi link không mất. Giá trị trên URL **phải lọc theo whitelist** trước khi
gửi: backend dùng `forbidNonWhitelisted`, một query lạ hay sai sẽ bị 400. Giá trị
mặc định không ghi lên URL. Mẫu: `features/users/use-users-search-params.ts`.

## Quy ước Auth

Code ở `src/features/auth/` và `src/routes/`; chi tiết endpoint ở `backend-nestjst-starter/docs/api/auth.md`.

- **Token chỉ ở trong bộ nhớ.** Access token nằm trong `auth-store.ts` (zustand, KHÔNG persist) cùng
  `{ user, status: 'loading' | 'authenticated' | 'anonymous', sessionExpired }`. Cấm lưu token vào
  localStorage/sessionStorage, cấm log token hay mật khẩu. Refresh token là cookie `httpOnly` do trình duyệt giữ
  (`path=/auth`), JS không đọc được; vì thế `withCredentials: true` là bắt buộc.
- **Khôi phục phiên (F5).** `AuthBootstrap` (bọc toàn bộ `Routes` trong `App.tsx`) gọi `POST /auth/refresh` rồi
  `GET /auth/me` đúng một lần (promise ở cấp module nên StrictMode không gọi hai lần), trong lúc đó hiện màn hình
  chờ toàn trang để không nháy sang `/login`. Refresh trả 401 = chưa đăng nhập (không báo lỗi). Lỗi mạng
  (`statusCode` 0) hoặc 5xx = màn hình lỗi có nút "Thử lại" (promise bị xóa khi thất bại nên chạy lại được), không coi là
  đã đăng xuất.
- **Làm mới khi 401.** Interceptor của `lib/api-client.ts`: request đã gửi token mà gặp 401 (trừ `/auth/login`,
  `/auth/refresh`) thì gọi `refreshSession()` — mọi request lỗi cùng lúc dùng chung một promise — rồi gửi lại request gốc
  đúng một lần (cờ `_retried`). Refresh bị máy chủ từ chối (4xx) thì `onSessionExpired`: xóa store, xóa cache react-query,
  `RequireAuth` đưa về `/login` kèm thông báo (hiện một lần). Mất mạng/5xx khi refresh thì **giữ phiên** và chỉ báo lỗi cho
  request đó.
- **`lib/` không import `features/`**, nên `features/auth/setup-auth-bridge.ts` (gọi trong `main.tsx`) đăng ký
  `getAccessToken` / `setAccessToken` / `onSessionExpired` vào `api-client` qua `configureAuth`.
  `components/` cũng không đọc phiên: `AdminLayout` nhận `account`, `role`, `onLogout` qua props từ
  `routes/admin-layout-container.tsx`.
- **Đọc user/role:** `useCurrentUser()`, `useCurrentRole()` (`features/auth/`). Không đọc role từ chỗ nào khác.
- **Sau đăng nhập** do `RedirectIfAuthenticated` quyết định (một nơi duy nhất): quay lại `state.from` nếu là đường dẫn
  nội bộ hợp lệ (`isSafeRedirectPath`: bắt đầu bằng `/`, không `//`, không `\`) và vai trò hiện tại vào được; không thì ADMIN →
  `/admin`, STAFF → `/admin/orders`, CUSTOMER → `/`.
- **Đăng xuất:** `useLogout()` gọi `/auth/logout` (bỏ qua lỗi), chuyển `/login`, xóa store và cache.
- **Bảo vệ route mới trong /admin:** (1) thêm mục vào `components/admin/nav-items.ts` với `roles`; (2) khai báo route trong
  `routes/admin-routes.tsx` bọc bằng `guarded("/admin/<mục>", <Trang />)` — quyền đọc từ `nav-items`, sidebar cũng lọc theo đó.
  Thứ tự guard: `RequireAuth` → `RequireRole` (ADMIN/STAFF) → khung admin → quyền từng mục; `*` nằm trong cùng cây nên
  `/admin/abc` khi chưa đăng nhập sang `/login` trước khi thấy 404. Route storefront cần đăng nhập thì bọc `RequireAuth`.
- **Mật khẩu tối thiểu 6 ký tự; nguồn duy nhất là `src/lib/password-rules.ts`** (`PASSWORD_MIN_LENGTH`, `PASSWORD_HINT`,
  `PASSWORD_TOO_SHORT_MESSAGE`). Schema, mô tả dưới ô và thông báo lỗi đều import từ đó, **không viết số độ dài ở nơi khác**.
  Form đăng ký và thêm người dùng dùng hằng này; form đăng nhập chỉ kiểm "không để trống" (mật khẩu cũ vẫn phải đăng nhập
  được). Không trim mật khẩu. Đổi quy tắc thì sửa backend (`@MinLength`) cùng lúc.
- **Đăng ký** (`/register`, `register-form.tsx`): không mở phiên. Thành công thì toast, chuyển `/login` kèm `state.email` (chỉ
  email, không có mật khẩu) để điền sẵn. 409 hiện dưới ô email; `errors[]` gắn đúng ô bằng `applyServerErrors`
  (`src/lib/form-errors.ts`, dùng chung login và register). `name`/`phone` bỏ trống thì không gửi. `useLogin`/`useRegister`
  đặt `gcTime: 0` để mật khẩu không nằm lại trong cache mutation.
- `ToastProvider` + `ToastViewport` nằm ở `App.tsx` (một chỗ cho cả auth và admin); không đặt thêm ở layout con.
- Guard phía frontend chỉ là UX; chặn thật là việc của backend (hiện backend chưa gắn guard cho `/users`...).

## Trang hiện có

- `/login` — đăng nhập (`features/auth/components/login-form.tsx` trong `auth-shell.tsx`). 401/403/lỗi mạng hiện thành
  Alert đầu form, lỗi `errors[]` gắn đúng ô.
- `/register` — đăng ký tài khoản CUSTOMER (`features/auth/components/register-form.tsx`): email, mật khẩu + nhập lại, họ tên và số điện thoại tùy chọn.
- `/` — trang chủ storefront, công khai. Khung dùng chung của mọi trang khách: `components/storefront/storefront-layout.tsx` (liên kết "bỏ qua tới nội dung", header dính, `<main id="main-content">`,
  footer), nối phiên + cây danh mục + cổng đăng nhập ở `routes/storefront-layout-container.tsx`. **Header**: logo `BrandLogo` bên trái; từ `xl` (1280px) thanh điều hướng gom về bên phải, cách nhóm biểu tượng 40px: các mục theo `STORE.navItems` (Tất cả sản phẩm, Áo, Quần, Phụ kiện, Quà tặng, Địa chỉ; mục danh mục chỉ hiện khi slug có trong cây danh mục), mục có danh mục con mở bảng toàn chiều rộng
  (`header-nav.tsx`, `header-nav-panel.tsx`, `hooks/use-mega-menu.ts`, `lib/nav-items.ts`; chi tiết ở `docs/storefront-design.md` mục 9b), rồi tìm kiếm (khung trượt từ trên, tự focus, Enter → `/products?q=`), nút trái tim "Yêu thích" (GIAO DIỆN GIẢ: chỉ toast "chưa có tính năng", không qua cổng đăng nhập, ẩn dưới 380px; docs mục 13), giỏ hàng, đăng nhập hoặc `UserMenu`; dưới `xl` còn nút menu (ngăn kéo cùng cấu hình, mục danh mục là accordion
  (`mobile-nav-list.tsx`), kèm tài khoản kể cả "Ảnh đại diện" và "Vào trang quản trị"), tìm kiếm, giỏ hàng. Nền header mờ nhẹ + đường kẻ khi cuộn. **Thanh thông báo chạy chữ** (`announcement-bar.tsx`, dựng trong `StorefrontLayout` ngay trên header, không dính): nội dung `STORE.announcements`, dừng khi rê chuột/focus, tắt khi giảm chuyển động. **Footer** (nền tối cố định nhờ class `dark` cục bộ, không token mới): 4 cột
  (giới thiệu + liên hệ, đường dẫn nhanh từ `navItems`, chính sách khách hàng, đăng ký nhận tin), dòng bản quyền. Nội dung cửa hàng (tên, khẩu hiệu,
  liên hệ, thanh thông báo, chữ chân trang) chỉ ở `lib/store-info.ts`: **khẩu hiệu, mô tả chân trang và các cam kết (miễn phí vận chuyển, đổi trả 30 ngày, ưu đãi 10%) là nội dung mẫu chờ xác nhận**, hệ thống chưa làm thật (bảng ở `docs/storefront-design.md` mục 13); liên hệ chưa có (footer ghi "đang được cập nhật"). **Trang chủ** (`pages/storefront/home`, chi tiết ở `docs/storefront-design.md` mục 14; nội dung ở `lib/home-content.ts`, ảnh tĩnh ở `public/home/`): hero carousel THỦ CÔNG 3 slide (nút, thanh tiến trình, phím ←/→, vuốt; không tự chạy; một `h1` ẩn thị giác, tiêu đề slide là `h2`; ảnh bo góc có lề, cạnh phải lòi ra ngoài container tối đa `--hero-bleed`, chữ canh theo container bằng `--container-inset`), "Danh mục nổi bật" (4 thẻ ảnh, gradient `scrim`), "Best sellers" (**TẠM**: hook `useBestSellerProducts` lấy sản phẩm tạo sớm nhất, chưa phải bán chạy; thẻ ở đây, ở "Sản phẩm mới về" và ở danh sách `/products` có hai nút GIẢ trái tim + "Thêm nhanh" qua `ProductCard quickActions`, chỉ toast), "Câu chuyện thương hiệu" (thẻ tối bo góc, tiêu đề serif nghiêng), "Sản phẩm mới về" (3 tab + danh sách cuộn ngang) và dải cam kết; mỗi khối tự xử lý rỗng/lỗi; ba khối có tiêu đề dựng trên khung chung `HomeSection`, tự bọc `Reveal`. Mọi chữ là **nội dung mẫu** chờ xác nhận, nhiều câu là cam kết chưa có thật (bảng ở `docs/storefront-design.md` mục 13). Khung nội dung của trang dùng `PageContainer` (`components/storefront/page-container.tsx`; header, chân trang, khung tìm kiếm, bảng điều hướng dùng cùng giá trị nhưng tự viết class). Trang storefront mới đặt trong cùng `<Route element={<StorefrontLayoutContainer />}>` ở `routes/storefront-routes.tsx`.
- `/thanh-toan`, `/dat-hang-thanh-cong/:code` — thanh toán COD và trang cảm ơn, chỉ CUSTOMER (`pages/storefront/checkout`, `order-success`; `features/checkout`: preview, voucher, địa chỉ 3 cấp, đặt đơn; `features/orders`: `Order`, `useOrder`, trang thành công). Tiền do backend tính (`POST /orders/preview`). Thanh toán online là giao diện giả. Chi tiết ở `docs/storefront-design.md` mục 20.
- `/thanh-toan-online/:code` — thanh toán chuyển khoản VietQR của đơn ONLINE, chỉ CUSTOMER (`pages/storefront/payment`, `features/payments`; chi tiết ở `docs/storefront-design.md` mục 22). QR vẽ từ `qrPayload` bằng `qrcode.react` 4.2.0 (đã ghim đúng phiên bản), polling 4 giây chỉ khi `AWAITING_PAYMENT`. Không có nút giả lập thanh toán; không để thông tin tài khoản/khóa trong frontend. Giỏ không được khôi phục khi đơn bị hủy/hết hạn (giới hạn hiện tại, mục 22).
- `/admin/payments` — "Giao dịch cần xem lại", chỉ ADMIN (`pages/admin/payments`, `features/admin-payments`): xác nhận cho đơn (kèm ghi chú) và đánh dấu đã xử lý. Nút "Xác nhận đã nhận tiền" ở chi tiết đơn admin cũng chỉ ADMIN.
- `/dia-chi` — danh sách cửa hàng (`pages/storefront/stores`, `components/storefront/store-list.tsx`) từ `STORE.stores` trong `lib/store-info.ts`; **mảng để rỗng cho tới khi chủ cửa hàng cung cấp thông tin thật** (rỗng thì hiện "Thông tin cửa hàng đang được cập nhật"). Không bịa địa chỉ, số điện thoại, giờ mở cửa.
- `/thong-tin/:slug` — trang thông tin tạm (`pages/storefront/info`, cấu hình `lib/info-pages.ts`: doi-tra, van-chuyen, huong-dan-chon-size, bao-mat, dieu-khoan): một `h1`; chưa có nội dung thì "Nội dung đang được cập nhật"; slug lạ thì 404 trong khung. Footer trỏ tới các trang này.
- **Form nhận tin** (`features/newsletter`, ở footer): chỉ giao diện; `subscribeNewsletter` (`api.ts`) là hàm TẠM trả "chưa khả dụng", thay bằng `POST /newsletter/subscribers` khi backend có. Không giả vờ thành công, không gọi API.
- `/products` — danh sách sản phẩm công khai (`docs/api/products.md`, `features/catalog`; thẻ có hai nút qua `quickActions`: trái tim GIẢ (chỉ toast, docs mục 13) và "Thêm nhanh" thật, docs mục 19). Trạng thái trên URL `?category=<slug>&q=&sort=newest|price-asc|price-desc&minPrice=&maxPrice=&page=` (`use-catalog-search-params.ts`, lọc
  whitelist, mặc định không ghi URL; **đổi lọc/sắp xếp dùng `replace`, đổi trang dùng `push`**). Slug danh mục được tra sang `categoryId` từ cây danh mục (`hooks/use-category-tree.ts`, GET `/categories`); slug không có
  → "Không tìm thấy danh mục", không gọi API sản phẩm. 12 sản phẩm/trang; lọc cây danh mục (gồm cả con) và 4 khoảng giá nhanh nửa mở (`constants.ts`), sắp xếp, chip bộ lọc đang áp dụng, phân trang bằng số.
  Cột lọc sticky từ `lg`, dưới `lg` là ngăn kéo (không tự đóng khi query đổi). Đổi lọc/trang giữ lưới cũ mờ, không nháy skeleton. Thẻ sản phẩm tải trước chi tiết khi rê chuột/focus, có huy hiệu "Hết hàng"/"Sắp hết" (`lowStock` chỉ có ở danh sách, không có ở chi tiết). Query key `["catalog", ...]`, tách khỏi `["products"]` của admin.
- `/products/:slug` — chi tiết sản phẩm công khai. Breadcrumb từ cây danh mục, ảnh (nút mở `ImageLightbox`), chọn màu/size (`radiogroup`, chip hết hàng/không có tổ hợp ghi "Hết hàng"; logic ở `variant-options.ts`), số lượng 1–99,
  "Thêm vào giỏ" (cột 6/6 từ `md`, 7/5 từ `lg`), thanh mua dính đáy ở di động, "Sản phẩm cùng danh mục" (`Reveal`). Không hiển thị SKU. 404 hiện trang thân thiện.
- **Cổng đăng nhập cho hành động mua** (`features/auth/use-require-login.ts`): khách bấm "Thêm vào giỏ" hoặc biểu tượng giỏ → `/login` kèm `state.from` (trang đang xem), đăng nhập xong quay lại đúng trang đó
  (`RedirectIfAuthenticated` đọc `from`; `returnPathState` giữ `from` khi chuyển giữa `/login` và `/register`). ADMIN/STAFF: toast "Tài khoản quản trị không dùng để mua hàng". Hook là `requireLogin(onCustomer)`:
  CUSTOMER thì chạy hành động thật (mở ngăn kéo giỏ, thêm vào giỏ). Container khung cung cấp `CartUiContext` (`useCartUi()`) cho trang chi tiết và thẻ sản phẩm.
- **Giỏ hàng** (`features/cart`, `/gio-hang`, ngăn kéo giỏ, huy hiệu ở header, "Thêm nhanh"): đã làm, chi tiết ở `docs/storefront-design.md` mục 19. Chỉ CUSTOMER; không thêm món đang chờ sau đăng nhập; giới hạn 10/dòng ở `lib/cart-rules.ts`. "Thanh toán ngay" dẫn tới `/thanh-toan` (mục 20).
- `/styleguide` — trình bày toàn bộ hệ thống (công khai, không cần đăng nhập).
- `/admin/dashboard` — dữ liệu giả (`src/features/dashboard/mock.ts`). Chỉ ADMIN.
- `/admin/users` — chỉ ADMIN. Danh sách người dùng nối backend thật: tìm kiếm, lọc, sắp xếp, phân trang phía
  server; thêm/sửa bằng `UserFormDialog` (react-hook-form + zod, `features/users/schemas.ts` phản chiếu
  validate backend); khóa/mở khóa luôn qua hộp xác nhận. Vì chỉ ADMIN vào được nên không có logic ẩn nút theo role.
- `/admin/categories` — ADMIN + STAFF. Danh sách nối backend thật (`GET /admin/categories`): tìm kiếm `q`, sắp theo tên, phân trang phía
  server, trạng thái trên URL (`features/categories/use-categories-search-params.ts`). Thêm/sửa bằng `CategoryFormDialog`
  (RHF + zod, `schemas.ts` phản chiếu `CreateCategoryDto`); chọn danh mục cha từ `GET /categories` (toàn bộ, phẳng) qua `hooks/use-category-options.ts`
  (dùng chung với products; kiểu `PublicCategory` ở `types/category.ts`), khi sửa thì loại chính nó và con cháu (`parent-options.ts`). Trường tùy chọn bỏ trống thì **không gửi** (slug trống khi thêm → backend tự sinh); khi sửa slug không được
  trống. Lỗi 400 theo ô vào đúng ô, 409/400 không theo ô hiện `Alert` nguyên văn đầu form. Xóa (cứng) qua `ConfirmDialog` có `error`: 409 còn
  sản phẩm/danh mục con thì hộp vẫn mở và hiện message của server. Chỉ ADMIN thấy nút Thêm và Xóa (`useCurrentRole()`); STAFF chỉ xem và sửa.
  `components/admin/search-input.tsx` là ô tìm kiếm debounce dùng chung (users và categories).
- `/admin/products` — ADMIN + STAFF (cả hai làm được mọi thao tác, không ẩn nút theo role; không có xóa, "xóa" = ẩn). Nối backend thật
  (`docs/api/products.md`). **Danh sách** `/admin/products`: tìm `q`, lọc danh mục (`categoryId`, khớp đúng danh mục, không gồm con) và trạng thái
  (`isActive`), sắp theo tên/giá/ngày tạo, phân trang phía server, toàn bộ trạng thái trên URL (`use-products-search-params.ts`). Cột "Biến thể" hiện
  "x/y đang bán" (API danh sách không trả tồn kho). Ẩn/hiện ngay trên dòng: ẩn qua `ConfirmDialog`, hiện lại làm luôn (`use-product-status-action.ts`).
  **Tạo** `/admin/products/new` và **sửa** `/admin/products/:id/edit` là trang riêng, dùng chung `ProductForm` (RHF + zod, `schemas.ts` phản chiếu
  `CreateProductDto`, chặn trùng SKU và cặp size-màu ngay trong form). Danh mục chọn dạng cây thụt lề (`components/admin/category-select.tsx`, dùng chung với Kho). Trường tùy chọn
  bỏ trống thì **không gửi** (slug trống khi tạo → backend tự sinh; `slug: ""` bị 400); khi sửa slug không được trống. PATCH chỉ gửi phần đổi
  (`form-mapping.ts`): biến thể có `id` chỉ gửi trường đổi, hàng mới (chưa có `id`) gửi đủ, biến thể đã lưu **không xóa được** (chỉ sửa hoặc bỏ
  tích "Đang bán"); `description`/`imageUrl` xóa trống thì gửi `null`. Lỗi 400 của biến thể (`variants.N.sku`) được đổi chỉ số về đúng hàng trong form
  (`remapVariantErrors`) vì ta chỉ gửi các hàng có đổi; 409 (trùng slug/SKU/size-màu) hiện `Alert` nguyên văn đầu form. Tồn kho (`stock`, `reserved`)
  chỉ đọc ở trang sửa và lấy từ `product.variants` của query MỚI NHẤT khớp theo id (không từ `baseline` của form, nên đổi tồn ở Kho rồi quay lại vẫn thấy số mới mà không động tới
  chỉnh sửa đang dở); biến thể đã lưu có liên kết "Quản lý tồn kho" sang `/admin/inventory?q=<SKU>` (thêm `includeHidden=true` khi sản phẩm ẩn hoặc biến thể ngừng bán,
  `inventoryLinkOf` trong `product-variant-row.tsx`); hàng mới thêm trong form chưa lưu thì không hiện tồn và không có liên kết. Ảnh upload bằng `ImageUploadField` (`components/shared/`, kind `products`, khung vuông `object-contain`; trong lúc tải thì khóa nút Lưu và chặn submit);
  mục thu gọn "Nhập URL ảnh" vẫn dùng được cho ảnh ở nơi khác (≤ 191 ký tự). "Xóa ảnh" chỉ xóa giá trị trong form, không xóa file trên server. Tạo xong về danh sách; sửa xong ở lại trang và
  `reset` form theo response. Trạng thái hiện/ẩn không nằm trong form (API chỉ đổi qua `PATCH :id/status`): nút Ẩn/Hiện ở đầu trang sửa. Link từ
  danh sách mang theo `location.state.listSearch` để "Quay lại" giữ bộ lọc và trang (`list-link.ts`).
- `/admin/inventory` — ADMIN + STAFF (cả hai làm được mọi thao tác). Nối backend thật (`docs/api/inventory.md`). Trang `pages/admin/inventory`: **dải 4 thẻ số liệu** (Tổng, Còn hàng, Sắp hết,
  Hết hàng; `GET /admin/inventory/summary`, chỉ nhận `categoryId` + `includeHidden` nên không theo ô tìm kiếm) là nút bật/tắt lọc `stockStatus`; **thanh công cụ**: tìm `q` (tên sản phẩm hoặc SKU),
  danh mục dạng cây (`CategorySelect`, gồm cả danh mục con), trạng thái tồn, ô "Hiện cả hàng đã ẩn" (`includeHidden`), "Xóa bộ lọc"; sắp xếp phía server chỉ theo tên, tồn kho, khả dụng; 20 dòng/trang
  (`PAGE_SIZE`, gửi `limit` tường minh); toàn bộ trạng thái trên URL (`use-inventory-search-params.ts`, whitelist, giá trị mặc định không ghi URL). Ngưỡng cảnh báo 0 hiện "Chưa đặt" kèm tooltip.
  Mỗi dòng có Nhập kho, Điều chỉnh và menu "⋯" (Xuất kho, Đặt ngưỡng, Xem lịch sử). **Hộp thoại dựng một lần** ở `inventory-dialogs.tsx`, ngoài bảng và ngoài `DropdownMenuContent`, điều khiển bằng state
  (`use-inventory-dialog.ts`, giữ cả nút đã mở để trả focus), nằm ngoài nhánh skeleton/lỗi/rỗng của `InventoryContent` nên danh sách tải lại không gỡ hộp thoại. Số trong hộp luôn lấy từ dòng MỚI NHẤT
  trong danh sách (khớp id), không từ lúc mở. Form RHF + zod (`schemas.ts` phản chiếu DTO; số trong form là chuỗi chỉ chứa chữ số, `IntegerField`): nhập (xem trước tồn sau; chặn nếu vượt INT), điều chỉnh
  (nhập SỐ ĐẾM thực tế; nút gửi khóa khi chênh lệch = 0), xuất (lý do DAMAGED/LOST/OTHER, "Khác" bắt buộc ghi chú), đặt ngưỡng (xem trước trạng thái). Vượt khả dụng khi xuất và dưới số đang giữ khi điều chỉnh
  chỉ cảnh báo, vẫn cho gửi, server quyết định. Lỗi theo mã (`use-stock-mutation-errors.ts`): 400 vào đúng ô, 404 toast + đóng + làm mới, 403 toast, 409 và còn lại hiện `Alert` nguyên văn trong hộp; **mất mạng
  (statusCode 0) khi nhập/xuất/điều chỉnh** hiện "Chưa rõ thao tác đã được ghi hay chưa…" và làm mới danh sách, KHÔNG tự thử lại (API không có khóa chống gửi trùng); đặt ngưỡng chỉ báo lỗi mạng thường.
  Lịch sử (`movements-list.tsx`): `useInfiniteQuery`, "Tải thêm" dựa vào `meta.totalPages`; loại EXPORT ánh xạ mã sang nhãn, ADJUST hiện nguyên văn, loại lạ hiện nguyên giá trị. Khóa truy vấn dưới `["inventory"]`;
  sau mỗi thao tác làm mới cả `["inventory"]` và `["products"]` (khóa chữ trong `queries.ts`, khớp `productKeys.all`, không import vì features không import lẫn nhau — đổi một nơi phải đổi nơi kia).
  Tên sản phẩm là liên kết sang trang sửa; nút "Quay lại" ở đó về danh sách sản phẩm chứ không về Kho (hạn chế đã biết: `list-link.ts` của products cố định đường dẫn).
- `/admin/orders` — ADMIN + STAFF (quyền y hệt nhau, không ẩn nút theo role). Nối backend thật (`docs/api/orders.md`, mục "Endpoint quản trị"), feature `features/admin-orders` (tách khỏi `features/orders` của khách, không import chéo; nhãn trạng thái dùng `ORDER_STATUS` ở `ui/badge.tsx`, đã thêm `PENDING_PAYMENT`).
  **Danh sách**: hàng nút lọc nhanh theo trạng thái (không kèm số đếm: backend chưa có API đếm cho admin), tìm `q` (mã đơn / SĐT / tên, debounce), hai ô ngày `from`/`to` (`<input type="date">`, chuỗi `YYYY-MM-DD` gửi thẳng, backend hiểu theo GMT+7),
  20 dòng/trang, mới nhất trước, toàn bộ trên URL (`use-admin-orders-search-params.ts`, lọc whitelist, `status=PACKING` bị bỏ). Cột "Số sản phẩm" là tổng `quantity` (danh sách không có `itemCount`).
  **Chi tiết** `/admin/orders/:id` (theo id số, không theo mã): khách và giao hàng, người phụ trách (`handledBy`), dòng hàng (bản chụp lúc đặt), thanh toán, tiền, lịch sử kèm tên người đổi (`actor`, `null` = hệ thống).
  **Đổi trạng thái** (`order-actions-panel.tsx`, `ORDER_ACTIONS` là `Record<OrderStatus, ...>`): PENDING xác nhận/hủy, CONFIRMED giao/hủy, SHIPPING hoàn tất; mỗi bước qua hộp xác nhận nêu hậu quả (giao = trừ kho và không hủy được nữa; hoàn tất = COD ghi đã thanh toán, không hoàn tác; hủy = lý do bắt buộc ≤ 500 ký tự).
  Lỗi theo mã (`use-order-status-action.ts`): 409 `ORDER_INVALID_TRANSITION` đóng hộp + báo + làm mới, 404/403 toast, còn lại (kể cả 409 không đủ tồn khi giao, backend chưa có `code`) hiện nguyên văn trong hộp. Sau khi đổi: ghi cache chi tiết, làm mới `["admin-orders"]`, `["inventory"]`, `["products"]`.
  **Huy hiệu sidebar**: số đơn PENDING cạnh mục "Đơn hàng" (`usePendingOrdersCount`: `GET /admin/orders?status=PENDING&limit=1` đọc `meta.total`; làm mới khi lấy lại focus và mỗi 60 giây khi tab hiện; truyền xuống `AdminLayout`/`AdminNav` bằng prop tùy chọn `navCounts`). Chưa có: in phiếu giao hàng, xuất file, hoàn hàng `RETURNED`.
- Các mục menu còn lại (Voucher) hiện là `PlaceholderPage`. Route lạ trong `/admin` hiện 404 trong khung admin; ngoài `/admin` hiện 404 TRONG khung storefront (`pages/storefront/not-found`, route `*` ở `routes/storefront-routes.tsx`: có header, footer, tiêu đề tab, `h1`).
- **Upload ảnh dùng chung**: `components/shared/image-upload-field.tsx` (props `value`, `onChange`, `kind` = `products`|`avatars`, `shape` = `square`|`circle`, `label`, `error`, `disabled`,
  `zoomable` (mặc định bật), `fallback`, `onUploadingChange`). Chọn file hoặc kéo-thả (tự dùng sự kiện trình duyệt, `hooks/use-file-drop.ts`), tiến độ và nút Hủy (`hooks/use-image-upload.ts`). Giới hạn
  (products 5 MB, avatars 2 MB; JPEG/PNG/WebP) ở `lib/image-rules.ts`, khớp backend; client chỉ kiểm loại file (`File.type`, rỗng cũng coi là sai), dung lượng, file rỗng
  và nhiều file, còn server kiểm thật (kể cả chữ ký byte). Upload lỗi thì giữ nguyên ảnh hiện tại. `ImagePreview` hiển thị mọi URL http(s), dùng cả
  trong bảng sản phẩm; prop `fallback` thay ô trống mặc định (avatar hiện chữ cái đầu).
- **Ảnh đại diện (avatar)**: mọi role chỉ sửa avatar của CHÍNH MÌNH (`PATCH /users/me/avatar`, `hooks/use-update-avatar.ts`, hàm gọi API nằm cùng file); ADMIN chỉ xem avatar người khác
  trong bảng người dùng, form sửa người dùng không có ô avatar. Lối vào là mục "Ảnh đại diện" trong `components/shared/user-menu.tsx` (dùng chung admin và storefront), mở
  `avatar-dialog.tsx` (vỏ `FormDialog`) + `avatar-form.tsx`. Hộp thoại đặt NGOÀI `DropdownMenuContent` và điều khiển bằng state (bấm mục menu đóng menu ngay, hộp thoại nằm trong
  sẽ bị hủy theo); `finalFocus` trả focus về nút mở menu vì mục menu đã bị gỡ. Ảnh tải lên ngay khi chọn nhưng chỉ gắn vào tài khoản khi bấm Lưu (nút Lưu chỉ bật khi có thay đổi và
  không đang tải/đang lưu); lưu lỗi thì giữ nguyên bản nháp, hộp thoại và avatar hiện tại. Lưu xong, `routes/use-avatar-saved.ts` cập nhật `useAuthStore.updateUser` và invalidate
  `userKeys.all`. `UserAvatar` (`components/shared/user-avatar.tsx`, cỡ `sm`/`md`) là lớp mỏng trên `ImagePreview` `shape="circle"`; không có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu
  (`avatar-initials.tsx`, quy tắc ở `initialsOf` trong `lib/display-name.ts`: chữ cái đầu của hai từ cuối, "Nguyễn Mạnh Tuấn" → "MT"). `decorative` (alt rỗng) khi tên đã hiện bằng chữ ngay cạnh.
  Ảnh tải lên rồi bị bỏ (Hủy, hoặc chọn ảnh khác) vẫn nằm trên server: hạn chế đã biết của backend, không có endpoint xóa file.
- **Xem ảnh lớn (lightbox)**: `ImagePreview` có prop `zoomable`; khi bật và ảnh hợp lệ, khung ảnh là nút (`type="button"`) mở `components/shared/image-lightbox.tsx`
  (`src`, `alt`, `open`, `onOpenChange`, `title?` — điều khiển từ ngoài nên dùng lại được ở storefront). Đang bật ở ô upload ảnh (khi không đang tải lên) và
  ảnh nhỏ trong bảng sản phẩm. Dựng thẳng trên `@base-ui/react/dialog` (như `ConfirmDialog`/`FormDialog`, vì bản shadcn `ui/dialog` trái token và đã bị xóa khỏi `ui/`), nền tối bằng lớp `dark` đặt lên
  Popup (vùng tối cố định thứ 5; token khai báo trong `.dark` và Tailwind dùng `@theme inline` nên mọi token trong Popup tự đổi, không cần token riêng). 100% = vừa khung (ảnh nhỏ giãn
  tối đa 2× kích thước gốc), giới hạn 100–400%. Bánh xe zoom quanh con trỏ, bấm đúp chuyển 100%/200%, kéo khi đã phóng to (giới hạn để ảnh luôn phủ kín khung), hai ngón
  chụm để zoom, phím `+ − 0` và mũi tên, bấm vùng trống đóng. Logic ở `hooks/use-pan-zoom.ts` (state, bánh xe, phím) + `use-pan-zoom-gestures.ts` (pointer events; bấm vùng trống
  nhận diện bằng pointer chứ không dùng `click` để không đóng nhầm sau khi kéo) + `lib/pan-zoom.ts` (toán thuần). Lint React Compiler (`react-hooks/refs`) coi object hook
  trả về là "chứa ref" nếu có ref trong đó, nên hai hook tách riêng và khung ảnh được giữ bằng `useState` + `ref={setStageEl}` ở nơi gọi.
- Dùng chung: `components/shared/user-menu.tsx` (menu tài khoản của storefront và admin-topbar; nhận dữ liệu qua props, "Vào trang quản trị" chỉ hiện khi
  `canAccessAdmin`), `brand-logo.tsx` (logo chữ của header, `AuthShell`, màn hình chờ). Tên hiển thị: `lib/display-name.ts` (`name` đã trim, trống thì phần trước `@` của email); chỗ cần phân biệt
  người dùng (hộp khóa/mở khóa) hiện kèm email.
- Trang 403 ("Bạn không có quyền truy cập") do `RequireRole` hiển thị tại chỗ.

Khi thêm trang nghiệp vụ: đọc `backend-nestjst-starter/docs/` trước, mỗi lần làm
một module, và cập nhật `/styleguide` nếu có thêm token hoặc component dùng chung.

## Việc tồn đọng

- Backend nên có `code` riêng cho 409 "không đủ tồn kho khi giao" (`InventoryService.shipOut` ném `ConflictException` không mã). Hiện frontend chỉ phân biệt được bằng "409 không có `code`" và hiện nguyên văn message.
- Admin đơn hàng: tab lọc nhanh chưa có số đếm (cần `GET /admin/orders/summary` ở backend); `PaymentStatusBadge` chưa có `FAILED` (đơn online chưa dùng), chỗ hiển thị đang dùng `Badge` variant `unpaid` cho trạng thái này.
- Quên mật khẩu / đặt lại mật khẩu (backend chưa có endpoint).
- Đồng bộ đăng xuất giữa nhiều tab (hiện tab khác chỉ biết khi request kế tiếp gặp 401).
- Storefront: trang chủ đã có; giỏ hàng đã có (mục Giỏ hàng); thanh toán COD, trang cảm ơn và thanh toán online chuyển khoản VietQR đã có (mục Trang hiện có; ví điện tử/thẻ là chip "Sắp có"); đánh giá, "Đơn hàng của tôi" chưa có.
- Storefront: ảnh sản phẩm là ảnh gốc từ máy chủ, không có bản thu nhỏ (`srcset`/resize) nên nặng trên di động; danh mục chưa có sản phẩm vẫn hiện trên menu (API danh mục không có cờ ẩn) và dẫn tới trạng thái rỗng; mục "Phụ kiện", "Quà tặng" trong `STORE.navItems` chỉ hiện khi GET `/categories` có slug `phu-kien`, `qua-tang` (dữ liệu hiện tại ĐÃ có cả hai; mục ẩn đi nếu danh mục bị xóa); khi các mục danh mục xuất hiện lần đầu, "Tất cả sản phẩm" dịch trái vì thanh điều hướng căn phải; khách bấm "Đăng ký"
  rồi mới đăng nhập vẫn giữ `from` (đã xử lý), nhưng đăng ký bằng đường khác (mở thẳng `/register`) thì không có đường quay lại; thanh mua dính đáy chưa tận dụng `env(safe-area-inset-bottom)` vì `index.html` chưa đặt `viewport-fit=cover`;
  cache `["catalog"]` không tự làm mới khi admin sửa sản phẩm trong cùng phiên (tối đa 30 giây theo staleTime).
- `AuthBootstrap` chặn render toàn ứng dụng tới khi `POST /auth/refresh` trả về, kể cả với khách chưa đăng nhập: trong lúc chờ chỉ hiện màn hình `SessionLoadingScreen` (wordmark, vòng quay, "Đang khôi phục phiên đăng nhập…"), nên storefront
  công khai không vẽ được gì trước khi có kết quả. Cải thiện cho sau: vẽ storefront ngay với `HeaderSession` ở trạng thái `loading` (header đã hỗ trợ), chỉ chặn các route cần phiên.
- `user-form-dialog.tsx` còn tự map lỗi API; chuyển sang `applyServerErrors` (`lib/form-errors.ts`) như login/register.
- Kho: nút "Quay lại" từ trang sửa sản phẩm về danh sách sản phẩm (không về Kho); liên kết "Quản lý tồn kho" mở trong cùng tab nên chỉnh sửa chưa lưu ở trang sửa sản phẩm bị mất; còn trùng lặp với products (hook tham số URL, skeleton bảng, tiêu đề sắp xếp, khung trạng thái danh sách) chưa gom lại.
- Sản phẩm: danh sách chưa có cột tồn kho (API không trả); ảnh upload xong mà không lưu (hoặc bị thay) vẫn nằm trên server, chưa có cách dọn; chưa cảnh báo khi rời trang sửa lúc có thay đổi chưa lưu; hoán đổi size/màu giữa hai biến thể trong một lần lưu bị 409 (tách hai lần lưu).
- Backend chưa gắn guard cho `/users`..., chưa thu hồi được refresh token, chưa giới hạn số lần đăng nhập sai (xem CLAUDE.md backend).
- Cookie refresh `SameSite=Lax`: khi deploy, frontend và backend phải cùng site (cùng domain gốc) thì cookie mới được gửi.
- **Nợ kỹ thuật từ đợt dọn code (nhánh `chore/cleanup-frontend`, đã chủ ý bỏ qua):**
  - Export dư (dùng trong file nhưng không ai import, khoảng 18 mục: `foldKey`, `ACCEPTED_IMAGE_TYPES`, `INFO_PAGES`, `MAX_UPSCALE`, `clamp`, `FooterLink`, `TabItem`, `ChipOption`, `CatalogCategoryRef`, `CreateVariantInput`, `HomeImage`, `HomeLink`, `HomeTab`, `ToastTone`, `ButtonProps`...): ROI thấp, chưa gỡ. Các hàm tạo query key (`catalogKeys`, `categoryKeys`, `inventoryKeys`, `productKeys`) GIỮ export.
  - Token CSS chưa dùng trong `global.css` (chưa xóa): `--fw-body-lg`, `--fw-body-sm`, `--fw-caption`, `--radius-2xl`, `--stroke-hairline`, `--color-status-cancelled-bg`, `--color-payment-unpaid-bg` (hai cái sau sắp dùng cho trạng thái đơn hàng) và các alias shadcn (`--color-secondary(-foreground)`, `--color-destructive-foreground`, `--color-sidebar-primary(-foreground)`, `--color-ink-inverse`).
  - File trên ~150 dòng chưa tách: `features/users/components/user-form-dialog.tsx` (372), `features/dashboard/components/revenue-chart.tsx` (288), `users-table.tsx` (244), `categories-table.tsx` (205), `products-table.tsx` (186), `features/products/form-mapping.ts` (177), `features/products/schemas.ts` (171), `components/shared/image-upload-field.tsx` (167). Giữ nguyên có chủ ý: `components/storefront/header-nav.tsx` (165), `lib/api-client.ts` (214), `lib/home-content.ts` (dữ liệu), `pages/styleguide` và `features/dashboard/mock.ts`.
  - Trùng lặp trong admin chưa gom (jscpd): `categories-table`/`users-table`, `inventory-sort-header`/`product-sort-header`, ba hook `use-*-search-params`, các `*-content`, bốn hộp thoại kho.
  - Storefront: `mx-auto w-full max-w-7xl px-gutter` còn được viết lại ở header, footer, `header-nav-panel`, `search-panel` (chủ ý, xem `page-container.tsx`); skeleton `shimmer aspect-[3/4]` lặp ở vài nơi (giữ).
  - Phong cách: repo chưa có Prettier; một số file admin/auth còn dấu `;` cuối dòng (`user-form-dialog`, `admin-topbar`, `auth-store`, `pages/admin/users`).
  - Ảnh `public/home/*.webp` vượt ngân sách dung lượng (xem `docs/storefront-design.md` mục 7), cần nén.



## Mức kiểm thử mặc định (áp dụng cho mọi phiên)

Người dùng tự mở giao diện và xem bằng mắt. Vì vậy:

1. KHÔNG tự dựng harness trình duyệt (puppeteer/playwright), KHÔNG chụp ảnh hàng loạt, KHÔNG so ảnh trước/sau, KHÔNG so computed style, KHÔNG dùng git archive để dựng bản "trước", trừ khi người dùng yêu cầu rõ trong prompt.
2. Kiểm tra tự động chỉ gồm: `npx tsc -b`, `npm run lint`, `npm run build` — chạy MỘT lần ở cuối. Có thể thêm 1 lệnh grep/tìm kiếm cho các việc kiểu "còn chỗ nào dùng X không".
3. Ngoại lệ được phép làm thêm (nêu một dòng lý do trước khi làm): khi sửa file dùng chung ảnh hưởng admin/auth (ví dụ ui/button.tsx, ui/input.tsx, global.css phần token chung) — khi đó chỉ cần chụp 2–3 trang admin tiêu biểu ở 1 cỡ màn, không quét toàn bộ.
4. Không mở tiến trình nền kéo dài. Nếu lỡ mở thì tắt trước khi báo cáo.
5. Không lặp vòng "chạy – sửa harness – chạy lại". Nếu một công cụ kiểm thử lỗi, bỏ nó, ghi vào báo cáo mục "chưa kiểm chứng", rồi dừng.
6. Báo cáo cuối luôn có hai mục ngắn: "Đã kiểm chứng" và "Chưa kiểm chứng — bạn nên xem bằng mắt các chỗ sau: ...", liệt kê cụ thể trang, cỡ màn, thao tác.
7. Khi xong phải đưa ngay kịch bản commit (helper ci(), nối "&& npx tsc -b"). Không mô phỏng từng commit trừ khi người dùng yêu cầu.