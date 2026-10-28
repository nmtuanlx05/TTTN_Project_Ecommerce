# CLAUDE.md — Frontend

File này ghi lại các quyết định thiết kế đã chốt cho giao diện web. Đọc trước khi
viết bất kỳ component nào.

Backend NestJS nằm ở thư mục song song `backend-nestjst-starter`, có CLAUDE.md
riêng. Tài liệu nghiệp vụ và schema dữ liệu ở `backend-nestjst-starter/docs/`.

Quy ước Git (commit, nhánh, merge) dùng chung với backend: xem mục "Git" trong `backend-nestjst-starter/CLAUDE.md` và `backend-nestjst-starter/docs/git-workflow.md`.

## Cấu trúc thư mục (bắt buộc)
- Chi tiết: `docs/cau-truc-thu-muc.md`. ĐỌC khi tạo module hoặc trang mới, hoặc khi không chắc đặt file ở đâu. Sửa nhỏ thì không cần đọc.
- Hai giao diện: storefront (khách) ở `/`, admin (ADMIN và STAFF dùng chung) ở `/admin`. Không làm trang staff riêng.
- Luật ngắn: pages chỉ ghép (không gọi API, không logic); thứ riêng của tính năng nằm trong `features/<tên>/`; features không import lẫn nhau; mỗi file một component dưới ~150 dòng; chỉ `api.ts` và `lib/api-client.ts` dùng axios; không sửa `components/ui/`.
- Tạo module mới: làm theo mục "Checklist module mới" trong docs.
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

### Ba quy tắc tương phản phải nhớ

1. **Trên `surface-sunken` (header bảng, sidebar admin) cấm dùng `ink-subtle`.**
   Cặp đó chỉ đạt 4.24, dưới ngưỡng AA. Dùng `ink-muted` (5.38).
2. **Viền của control phải là `border-control`, không phải `border-default`.**
   `border-default` chỉ đạt 1.41 — nó là đường kẻ trang trí. `border-control`
   đạt 3.79, thỏa WCAG 1.4.11 cho ranh giới input/checkbox/radio.

3. **Nền hover phải khác nền của vùng nó nằm trên.** Popup, dropdown, dialog dùng
   `surface-raised`; dark mode từng đặt `surface-hover` trùng đúng màu đó nên mục
   đang hover không đổi gì. Hiện hover/raised ở dark là 1.27 (light là 1.21). Chữ
   `ink-subtle` không dùng trên nền hover (dark chỉ 3.99).

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
- `axios` + `@tanstack/react-query` cho gọi API — xem mục "Quy ước gọi API".
- `react-hook-form` + `zod` + `@hookform/resolvers` cho form.
- `zustand` chỉ cho store phiên đăng nhập (`features/auth/auth-store.ts`); state khác dùng react-query hoặc state cục bộ.
- `@tanstack/react-table` **v9** — API khác hẳn v8: dùng `useTable` +
  `tableFeatures({...})` chứ không phải `useReactTable` + `getCoreRowModel()`.
  Xem `src/pages/styleguide/index.tsx` làm mẫu.
- Toast dùng `@base-ui/react/toast` qua `src/components/ui/toast.tsx`.
  `react-toastify` còn trong `package.json` nhưng **không dùng** — nó không đọc
  token của ta.

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
  `{ items, meta }`), `apiSend` (POST/PATCH/PUT). Không tự đọc `response.data.data`.
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
  Alert đầu form, lỗi `errors[]` gắn đúng ô. Có sáng/tối.
- `/register` — đăng ký tài khoản CUSTOMER (`features/auth/components/register-form.tsx`): email, mật khẩu + nhập lại, họ tên và số điện thoại tùy chọn.
- `/` — trang chủ storefront, công khai. Khung `components/storefront/storefront-layout.tsx` (header dính + `<Outlet/>` + footer),
  nối phiên ở `routes/storefront-layout-container.tsx`. Header: `BrandLogo` bên trái; bên phải `ThemeToggle` và một mục tài khoản —
  đang tải phiên thì giữ chỗ, chưa đăng nhập chỉ có MỘT nút "Đăng nhập" (không có "Đăng ký": `/login` đã có liên kết sang `/register`),
  đã đăng nhập thì `UserMenu`. Nội dung: `home-hero.tsx` + `EmptyState` "Sản phẩm sắp ra mắt". **Đây là nền storefront**: khi có
  `features/products`, thay khối `EmptyState` trong `pages/storefront/home` bằng danh sách sản phẩm; trang storefront mới đặt trong cùng
  `<Route element={<StorefrontLayoutContainer />}>` ở `routes/storefront-routes.tsx` để có sẵn header/footer.
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
  `CreateProductDto`, chặn trùng SKU và cặp size-màu ngay trong form). Danh mục chọn dạng cây thụt lề (`category-select.tsx`). Trường tùy chọn
  bỏ trống thì **không gửi** (slug trống khi tạo → backend tự sinh; `slug: ""` bị 400); khi sửa slug không được trống. PATCH chỉ gửi phần đổi
  (`form-mapping.ts`): biến thể có `id` chỉ gửi trường đổi, hàng mới (chưa có `id`) gửi đủ, biến thể đã lưu **không xóa được** (chỉ sửa hoặc bỏ
  tích "Đang bán"); `description`/`imageUrl` xóa trống thì gửi `null`. Lỗi 400 của biến thể (`variants.N.sku`) được đổi chỉ số về đúng hàng trong form
  (`remapVariantErrors`) vì ta chỉ gửi các hàng có đổi; 409 (trùng slug/SKU/size-màu) hiện `Alert` nguyên văn đầu form. Tồn kho (`stock`, `reserved`)
  chỉ đọc ở trang sửa, nhập kho thuộc module Kho. Ảnh chỉ là một URL (≤ 191 ký tự), chưa upload. Tạo xong về danh sách; sửa xong ở lại trang và
  `reset` form theo response. Trạng thái hiện/ẩn không nằm trong form (API chỉ đổi qua `PATCH :id/status`): nút Ẩn/Hiện ở đầu trang sửa. Link từ
  danh sách mang theo `location.state.listSearch` để "Quay lại" giữ bộ lọc và trang (`list-link.ts`).
- Các mục menu còn lại hiện là `PlaceholderPage`. Route lạ trong `/admin` hiện 404 trong khung admin; ngoài `/admin` hiện 404 toàn trang.
- Dùng chung: `components/shared/user-menu.tsx` (menu tài khoản của storefront và admin-topbar; nhận dữ liệu qua props, "Vào trang quản trị" chỉ hiện khi
  `canAccessAdmin`), `brand-logo.tsx` (logo chữ của header, `AuthShell`, màn hình chờ), `theme-toggle.tsx` (từ `md` nhóm 3 nút, dưới `md` một nút xoay vòng
  44px — `theme-cycle-button.tsx`, `theme-options.ts`). Tên hiển thị: `lib/display-name.ts` (`name` đã trim, trống thì phần trước `@` của email); chỗ cần phân biệt
  người dùng (hộp khóa/mở khóa) hiện kèm email.
- Trang 403 ("Bạn không có quyền truy cập") do `RequireRole` hiển thị tại chỗ.

Khi thêm trang nghiệp vụ: đọc `backend-nestjst-starter/docs/` trước, mỗi lần làm
một module, và cập nhật `/styleguide` nếu có thêm token hoặc component dùng chung.

## Việc tồn đọng

- Quên mật khẩu / đặt lại mật khẩu (backend chưa có endpoint).
- Đồng bộ đăng xuất giữa nhiều tab (hiện tab khác chỉ biết khi request kế tiếp gặp 401).
- Trang đích của STAFF sau đăng nhập đang là `/admin/orders` (placeholder); đổi khi có trang Đơn hàng thật.
- Trang chủ storefront (`/`) mới có header + hero + khối "sắp ra mắt"; chưa có điều hướng, giỏ hàng, tìm kiếm (thêm khi có chức năng).
- `user-form-dialog.tsx` còn tự map lỗi API; chuyển sang `applyServerErrors` (`lib/form-errors.ts`) như login/register.
- Sản phẩm: danh sách chưa có cột tồn kho (API không trả); chưa upload ảnh; chưa cảnh báo khi rời trang sửa lúc có thay đổi chưa lưu; hoán đổi size/màu giữa hai biến thể trong một lần lưu bị 409 (tách hai lần lưu).
- Backend chưa gắn guard cho `/users`..., chưa thu hồi được refresh token, chưa giới hạn số lần đăng nhập sai (xem CLAUDE.md backend).
- Cookie refresh `SameSite=Lax`: khi deploy, frontend và backend phải cùng site (cùng domain gốc) thì cookie mới được gửi.
