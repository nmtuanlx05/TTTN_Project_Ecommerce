# API Products

Viết theo code (`src/products/`, `src/common/`, `src/auth/guards/roles.guard.ts`). Phân quyền (401/403), validate, định dạng
response và lỗi đã có e2e với service giả (`test/products.e2e-spec.ts`); phần ánh xạ dữ liệu public/admin (không lộ trường nội bộ)
có unit test (`src/products/products.mapper.spec.ts`); câu truy vấn public (bộ lọc giá, `excludeId`, sắp xếp có khóa phụ `id`)
được kiểm bằng Prisma giả ở `src/products/products.service.spec.ts`. **Logic truy vấn trên database thật (phân trang, tìm kiếm, lọc, trùng
slug/SKU, upsert biến thể, ẩn sản phẩm rồi kiểm tra public) chưa được test tự động**, cần chạy thử tay.

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `application/json`
- CORS: origin `http://localhost:5173`, bật `credentials`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- Xác thực: header `Authorization: Bearer <accessToken>` (lấy từ `POST /auth/login`, xem `docs/api/auth.md`).
  `JwtAuthGuard` bật toàn cục: endpoint không đánh dấu public mà thiếu token → 401.

## Quyền

| Nhóm | Đường dẫn | Ai gọi được |
|---|---|---|
| Public | `GET /products`, `GET /products/:slug` | Mọi người, không cần token |
| Admin | Mọi endpoint `/admin/products...` (xem, tạo, sửa, ẩn/hiện) | ADMIN, STAFF |

- Không có token (hoặc token sai/hết hạn) → **401**. Có token nhưng là CUSTOMER → **403** `Bạn không có quyền thực hiện thao tác này`.
- Quyền luôn được kiểm tra ở server theo role hiện tại trong DB (đổi role có hiệu lực ngay).
- **Không có `DELETE`** cho sản phẩm và biến thể. "Xóa" sản phẩm = ẩn bằng `PATCH /admin/products/:id/status`.
  Biến thể không bao giờ bị xóa cứng, chỉ ẩn bằng `isActive: false` khi sửa sản phẩm.

## Đối tượng

Tiền là VND, số nguyên (JSON number). Thời gian là chuỗi ISO 8601.

### Admin: item trong danh sách (`GET /admin/products`)

```json
{
  "id": 1,
  "name": "Áo thun basic cổ tròn",
  "slug": "ao-thun-basic-co-tron",
  "price": 199000,
  "imageUrl": "https://picsum.photos/seed/ao-thun-basic-co-tron/600/800",
  "isActive": true,
  "createdAt": "2026-10-28T03:00:00.000Z",
  "updatedAt": "2026-10-28T03:00:00.000Z",
  "category": { "id": 3, "name": "Áo thun" },
  "variantCount": 8,
  "activeVariantCount": 8
}
```

- `variantCount`: tổng số biến thể; `activeVariantCount`: số biến thể đang bán (`isActive = true`).
- Danh sách **không** có `description` và tồn kho. Giá nằm ở sản phẩm (không có giá theo biến thể) nên chỉ có một `price`.
- `imageUrl`: `string | null` = **ảnh đầu tiên** (`sortOrder` nhỏ nhất). Sản phẩm chưa có dòng ảnh nào thì dự phòng bằng cột cũ.
  Trường này **deprecated**, giữ để tương thích; nguồn thật là `images` (xem chi tiết).

### Admin: chi tiết (`GET /admin/products/:id`, và response của POST/PATCH)

```json
{
  "id": 1,
  "name": "Áo thun basic cổ tròn",
  "slug": "ao-thun-basic-co-tron",
  "description": "Chất liệu thoáng mát.",
  "price": 199000,
  "imageUrl": "https://picsum.photos/seed/ao-thun-basic-co-tron-1/600/800",
  "images": [
    { "id": 31, "url": "https://picsum.photos/seed/ao-thun-basic-co-tron-1/600/800", "sortOrder": 0 },
    { "id": 32, "url": "https://picsum.photos/seed/ao-thun-basic-co-tron-2/600/800", "sortOrder": 1 }
  ],
  "isActive": true,
  "createdAt": "2026-10-28T03:00:00.000Z",
  "updatedAt": "2026-10-28T03:00:00.000Z",
  "category": { "id": 3, "name": "Áo thun", "slug": "ao-thun" },
  "variants": [
    {
      "id": 10, "sku": "ATB-S-TRANG", "size": "S", "color": "Trắng", "colorHex": "#FFFFFF",
      "isActive": true, "stock": 20, "reserved": 0, "minStock": 5
    }
  ]
}
```

- `images`: chỉ gồm **dòng ảnh thật** (có `id` thật), sắp theo `sortOrder` tăng dần; **không** dự phòng từ `imageUrl`. Mảng rỗng
  nếu sản phẩm chưa có ảnh. Id ảnh **đổi** sau mỗi lần PATCH có gửi `images` (các dòng được tạo lại).
- `imageUrl` (deprecated): ảnh đầu; chưa có dòng ảnh nào thì là giá trị cột cũ.
- `colorHex`: `string | null`, dạng `#RRGGBB` in hoa.

- `variants` gồm cả biến thể đang ẩn, sắp theo `id` tăng dần. `stock`, `reserved`, `minStock` **chỉ đọc** ở đây
  (do module Kho quản lý, xem `docs/api/inventory.md`); API sản phẩm không cho ghi các trường này.
- `description`: `string | null`.

### Public: item trong danh sách (`GET /products`)

```json
{
  "id": 1,
  "name": "Áo thun basic cổ tròn",
  "slug": "ao-thun-basic-co-tron",
  "price": 199000,
  "imageUrl": "https://picsum.photos/seed/ao-thun-basic-co-tron-1/600/800",
  "secondImageUrl": "https://picsum.photos/seed/ao-thun-basic-co-tron-2/600/800",
  "colors": [
    { "name": "Trắng", "hex": "#FFFFFF" },
    { "name": "Đen", "hex": "#111111" }
  ],
  "category": { "id": 3, "name": "Áo thun", "slug": "ao-thun" },
  "inStock": true,
  "lowStock": false
}
```

- `imageUrl`: ảnh đầu (`sortOrder` nhỏ nhất); chưa có dòng ảnh nào thì dự phòng bằng cột cũ `imageUrl`; không có gì thì `null`.
- `secondImageUrl`: ảnh thứ hai (dùng cho hiệu ứng hover) hoặc `null`.
- `colors`: các màu khác nhau của biến thể **đang bán**, bỏ trùng không phân biệt hoa thường/dấu, theo thứ tự biến thể (`id` tăng dần).
  `hex` có thể `null` (biến thể chưa có mã màu); cùng màu mà biến thể đầu chưa có hex thì lấy hex của biến thể sau.
- Ảnh và biến thể được lấy cùng truy vấn danh sách (Prisma gom theo `IN (...)`, số truy vấn cố định, không tăng theo số sản phẩm).

- `inStock`: `true` khi có ít nhất một biến thể đang bán còn tồn khả dụng (`stock - reserved > 0`).
- `lowStock`: `true` (hiện huy hiệu "Sắp hết") khi sản phẩm còn hàng **và mọi biến thể đang bán còn hàng đều ở trạng thái `low`**
  của module Kho (`0 < available <= minStock`, xem `docs/api/inventory.md`). Biến thể đã hết hàng không tính; chỉ một biến thể
  còn nhiều hàng là `lowStock = false`. Không có biến thể đang bán thì `false`.
  - Phụ thuộc ngưỡng `minStock` do admin/staff đặt ở trang kho; `minStock` mặc định **0** nên khi chưa đặt ngưỡng thì
    `lowStock` không bao giờ `true`. `lowStock = true` luôn kéo theo `inStock = true`.
  - Chỉ có cờ boolean: không trả `stock`, `reserved`, `minStock` hay số lượng nào. `GET /products/:slug` **không** có `lowStock`.

### Public: chi tiết (`GET /products/:slug`)

```json
{
  "id": 1,
  "name": "Áo thun basic cổ tròn",
  "slug": "ao-thun-basic-co-tron",
  "description": "Chất liệu thoáng mát.",
  "price": 199000,
  "imageUrl": "https://picsum.photos/seed/ao-thun-basic-co-tron-1/600/800",
  "images": [
    { "url": "https://picsum.photos/seed/ao-thun-basic-co-tron-1/600/800" },
    { "url": "https://picsum.photos/seed/ao-thun-basic-co-tron-2/600/800" }
  ],
  "category": { "id": 3, "name": "Áo thun", "slug": "ao-thun" },
  "inStock": true,
  "variants": [
    { "id": 10, "sku": "ATB-S-TRANG", "size": "S", "color": "Trắng", "colorHex": "#FFFFFF", "inStock": true }
  ]
}
```

- `images`: toàn bộ ảnh theo thứ tự hiển thị, chỉ có `url`. Chưa có dòng ảnh nào nhưng cột cũ `imageUrl` có giá trị thì
  `images = [{ "url": <imageUrl> }]`; không có ảnh nào thì `[]`.
- `imageUrl` (**deprecated**, giữ để tương thích): ảnh đầu, hoặc `null`.
- `colorHex`: `string | null`.

- Chỉ gồm biến thể **đang bán**. Không có `isActive`, `createdAt`, `updatedAt`, `stock`, `reserved`, `minStock`:
  khách chỉ biết còn hay hết (`inStock`), không biết số lượng.

## Endpoint

| Method | Đường dẫn | Mô tả | Quyền |
|---|---|---|---|
| GET | `/products` | Danh sách sản phẩm đang bán: tìm kiếm, lọc, sắp xếp, phân trang | Public |
| GET | `/products/:slug` | Chi tiết theo slug | Public |
| GET | `/admin/products` | Danh sách (cả sản phẩm ẩn và hiện) | ADMIN, STAFF |
| GET | `/admin/products/:id` | Chi tiết kèm đủ biến thể | ADMIN, STAFF |
| POST | `/admin/products` | Tạo sản phẩm kèm biến thể | ADMIN, STAFF |
| PATCH | `/admin/products/:id` | Sửa sản phẩm và thêm/sửa biến thể | ADMIN, STAFF |
| PATCH | `/admin/products/:id/status` | Ẩn / hiện sản phẩm | ADMIN, STAFF |

`:id` phải là số nguyên; sai (vd `/admin/products/abc`) → **400** `ID không hợp lệ`.

### GET /products

Query params (đều tùy chọn):

| Tên | Kiểu | Mặc định | Ràng buộc / ý nghĩa |
|---|---|---|---|
| `q` | chuỗi | — | Tìm gần đúng (chứa) trong `name`, `slug`; bỏ khoảng trắng đầu/cuối. Không phân biệt hoa/thường và dấu tiếng Việt (do collation DB) |
| `categoryId` | số nguyên | — | ≥ 1; lấy sản phẩm của danh mục này **và mọi danh mục con/cháu** của nó. Id không tồn tại → danh sách rỗng (không lỗi). Không có `categorySlug`: frontend tra slug sang id từ `GET /categories` |
| `minPrice` | số nguyên | — | 0 – 2147483647; lấy sản phẩm có `price >= minPrice` |
| `maxPrice` | số nguyên | — | 0 – 2147483647; lấy sản phẩm có `price <= maxPrice`. Nếu gửi cả hai mà `minPrice > maxPrice` → **400** (lỗi ở `maxPrice`). Chỉ gửi một trong hai thì không có lỗi |
| `excludeId` | số nguyên | — | ≥ 1; loại sản phẩm có id này khỏi kết quả (dùng cho "sản phẩm liên quan") |
| `sortBy` | enum | `createdAt` | `createdAt`, `price`, `name` |
| `order` | enum | `desc` | `asc`, `desc` |
| `page` | số nguyên | 1 | ≥ 1 |
| `limit` | số nguyên | **12** | 1–**48** |

- **Giới hạn khác admin:** public mặc định `limit=12`, tối đa **48**; `GET /admin/products` vẫn mặc định 10, tối đa 100. (Trước đây
  public dùng chung 10/100.)
- Chỉ trả sản phẩm `isActive = true` **và còn ít nhất một biến thể đang bán**. Sản phẩm không có biến thể nào đang bán bị ẩn khỏi public.
  Sản phẩm đang bán nhưng **hết hàng vẫn có trong danh sách** với `inStock: false`.
- Sắp xếp phụ theo `id` cùng chiều `order` (mọi giá trị `sortBy`), nên sản phẩm trùng giá, tên hay ngày tạo vẫn có thứ tự cố định:
  không lặp hay sót sản phẩm giữa các trang.
- Các điều kiện kết hợp bằng AND; `total` đếm theo cùng điều kiện lọc.
- **Không nhận `isActive`** hay bất kỳ query nào không khai báo ở bảng trên (vd `foo=1`, `stock=1`) → **400**
  `Trường <tên> không được phép gửi lên`. Vì vậy không có cách nào truy vấn sản phẩm đang ẩn qua đường public, kể cả khi
  gửi kèm token ADMIN. Trang vượt quá `totalPages` trả `data: []`.

Ba kiểu sắp xếp của storefront:

| Kiểu | Query |
|---|---|
| Mới nhất | `sortBy=createdAt&order=desc` (mặc định) |
| Giá tăng dần | `sortBy=price&order=asc` |
| Giá giảm dần | `sortBy=price&order=desc` |

(`sortBy=name` cũng được hỗ trợ.)

Cách dùng cho các khối của storefront (không có endpoint riêng):

- **Sản phẩm mới (trang chủ):** `GET /products?sortBy=createdAt&order=desc&limit=8`
- **Sản phẩm liên quan:** `GET /products?categoryId=<category.id của sản phẩm đang xem>&excludeId=<id sản phẩm đang xem>&limit=8`
  (mới nhất trước). Số lượng do frontend truyền qua `limit`, server không ép riêng. Nếu danh mục của sản phẩm có danh mục con thì kết
  quả gồm cả sản phẩm của các danh mục con.
- **Lọc theo giá:** `GET /products?minPrice=100000&maxPrice=300000`

Ví dụ `GET /products?categoryId=1&sortBy=price&order=asc&page=1&limit=2`:

```json
{
  "success": true,
  "data": [
    {
      "id": 9, "name": "Quần short kaki", "slug": "quan-short-kaki", "price": 249000,
      "imageUrl": "https://picsum.photos/seed/quan-short-kaki/600/800",
      "category": { "id": 6, "name": "Quần short", "slug": "quan-short" }, "inStock": true, "lowStock": false
    }
  ],
  "meta": { "page": 1, "limit": 2, "total": 6, "totalPages": 3 }
}
```

### GET /products/:slug

- **200**, `data` là chi tiết public.
- Sản phẩm không tồn tại, đang ẩn, hoặc không còn biến thể đang bán → **404** `Không tìm thấy sản phẩm` (không phân biệt các trường hợp này).

### GET /admin/products

Query params (đều tùy chọn): `q`, `categoryId`, `sortBy`, `order`, `page`, `limit` như `GET /products` (nhưng `limit` mặc định
10, tối đa 100), không có `minPrice`/`maxPrice`/`excludeId` (gửi lên → 400), và thêm:

| Tên | Kiểu | Mặc định | Ràng buộc / ý nghĩa |
|---|---|---|---|
| `isActive` | boolean | — | `true` hoặc `false` (chuỗi). Không gửi = lấy **cả** sản phẩm ẩn và hiện |

- `categoryId` ở admin khớp **đúng** danh mục đó (không gồm danh mục con).
- Mặc định mới tạo trước (`createdAt` giảm dần).
- Trả cả sản phẩm không còn biến thể đang bán.

### GET /admin/products/:id

- **200**, `data` là chi tiết admin.
- Lỗi: 400 (id sai), 404 `Không tìm thấy sản phẩm với ID #<id>`.

### POST /admin/products

Body:

```json
{
  "name": "Áo thun basic cổ tròn",
  "slug": "ao-thun-basic-co-tron",
  "description": "Chất liệu thoáng mát.",
  "price": 199000,
  "images": [
    { "url": "https://cdn.example.com/ao-thun-1.jpg" },
    { "url": "https://cdn.example.com/ao-thun-2.jpg" }
  ],
  "categoryId": 3,
  "variants": [
    { "sku": "ATB-S-TRANG", "size": "S", "color": "Trắng", "colorHex": "#FFFFFF" },
    { "sku": "ATB-M-TRANG", "size": "M", "color": "Trắng", "colorHex": "#ffffff", "isActive": true }
  ]
}
```

- **201**, `data` là chi tiết admin. Sản phẩm và toàn bộ biến thể được tạo trong **một transaction** (lỗi ở biến thể thì không tạo sản phẩm).
- Bắt buộc: `name`, `price`, `categoryId`, `variants` (ít nhất 1, tối đa 100). Mỗi biến thể bắt buộc `sku`, `size`, `color`.
- Sản phẩm mới luôn `isActive = true` (không nhận `isActive`; ẩn bằng `PATCH :id/status`).
- **Tồn kho:** không nhận `stock`, `reserved`, `minStock`; biến thể mới có `stock = 0`, `reserved = 0`, `minStock = 0`
  (nên `inStock = false` cho tới khi nhập kho qua `POST /admin/inventory/:variantId/import`).
- **Slug:** bỏ trống (hoặc `null`) thì tự sinh từ tên (bỏ dấu tiếng Việt, `đ` → `d`, kebab-case: `Áo Thun Nam` → `ao-thun-nam`).
  Slug tự sinh bị trùng thì thêm hậu tố `-2`, `-3`... Client **tự gửi** `slug` mà trùng → 409.
  **`"slug": ""` bị từ chối 400** (giống categories) - muốn tự sinh thì bỏ hẳn trường `slug`. Tên chỉ có ký hiệu và không gửi `slug`
  → 400 `Tên sản phẩm phải chứa ít nhất một chữ cái hoặc chữ số`.
- **SKU:** bỏ khoảng trắng hai đầu và **tự đổi thành chữ in hoa** (`atb-s` → `ATB-S`). SKU là duy nhất toàn hệ thống,
  không phân biệt hoa/thường và dấu (do collation DB).
- **Biến thể trùng:** trong cùng body không được trùng SKU hoặc trùng cặp (`size`, `color`) → 400.
- **Ảnh (`images`):** mảng `{ "assetId" }` hoặc `{ "url" }`, **thứ tự trong mảng là thứ tự hiển thị** (`sortOrder` = vị trí), ảnh đầu là ảnh đại diện. Tối đa **6** ảnh,
  tối đa 500 ký tự mỗi URL. **Trùng nhau trong mảng → 400** `Ảnh "<url>" bị trùng trong danh sách ảnh`. Muốn dùng ảnh upload thì gọi
  `POST /uploads/products` trước rồi đưa `assetId` (ưu tiên) hoặc `url` nhận được vào đây. Server kiểm ảnh còn hiệu lực (xem "Ảnh (`images[]`)").
  Cột cũ `Product.imageUrl` được đồng bộ = ảnh đầu (null nếu ảnh đầu dài hơn 500 ký tự hoặc không có ảnh).
- **Tương thích tạm (`imageUrl` cũ):** nếu **không** gửi `images` mà chỉ gửi `imageUrl` thì coi như `images = [imageUrl]`
  (`null` hoặc `""` = không có ảnh). Gửi cả hai thì `images` thắng. Cơ chế này **tạm thời**, sẽ bỏ khi `imageUrl` bị gỡ.
- **Mã màu (`colorHex`):** tùy chọn, dạng `#RRGGBB`, chữ thường được tự đổi thành **in hoa**; `""` hoặc `null` = chưa có mã.
  **Nhất quán:** trong cùng một sản phẩm, các biến thể cùng tên màu (không phân biệt hoa thường/dấu) mà đều có `colorHex` thì phải
  **cùng một mã**, nếu không → 400 `Màu "<màu>" có hai mã màu khác nhau (<mã 1> và <mã 2>). Các biến thể cùng màu phải dùng chung một mã màu`.
- **Danh mục:** `categoryId` không tồn tại → **400** `Danh mục với ID #<id> không tồn tại`.
- Tên sản phẩm không bắt buộc duy nhất.
- Lỗi: 400, 401, 403, 409.

### PATCH /admin/products/:id

Body (mọi trường tùy chọn):

```json
{
  "name": "Áo phông basic",
  "price": 219000,
  "description": null,
  "variants": [
    { "id": 10, "isActive": false },
    { "id": 11, "sku": "ATB-M-TRANG-V2" },
    { "sku": "ATB-XL-TRANG", "size": "XL", "color": "Trắng" }
  ]
}
```

- **200**, `data` là chi tiết admin sau cập nhật. Cập nhật sản phẩm và biến thể chạy trong **một transaction**.
- Chỉ `name`, `slug`, `description`, `price`, `imageUrl`, `images`, `categoryId`, `variants` được sửa; trường khác (vd `id`, `isActive`)
  → 400. Ẩn/hiện sản phẩm dùng `PATCH :id/status`.
- **Đổi tên không tự đổi slug** (giữ URL ổn định). Muốn đổi slug phải gửi `slug` tường minh (trùng → 409; `""` → 400).
- Không gửi một trường thì giữ nguyên. `description` và `imageUrl`: gửi `null` hoặc `""` để **xóa** giá trị.
  `name`, `price`, `categoryId` gửi `null` được coi như không gửi.
- **`images` khi PATCH:** có gửi thì **thay cả mảng** theo thứ tự gửi lên (xóa dòng không còn, thêm dòng mới, cùng một transaction với việc sửa sản phẩm);
  không gửi thì giữ nguyên ảnh. `images: []` xóa hết ảnh. `images: null` → 400. Quy tắc ảnh (tối đa 6, URL, không trùng) như khi tạo.
  Vì thay cả mảng nên id ảnh đổi sau mỗi lần sửa; đổi thứ tự = gửi lại mảng theo thứ tự mới.
- **Tương thích tạm với `imageUrl` cũ:** chỉ gửi `imageUrl` (không gửi `images`) = `images = [imageUrl]`; `imageUrl: null` hoặc `""`
  = **xóa toàn bộ ảnh** (không chỉ ảnh đầu). **Cảnh báo:** form cũ chỉ biết `imageUrl` sẽ thu sản phẩm nhiều ảnh về một ảnh khi lưu.

#### Ngữ nghĩa `variants` khi PATCH

| Phần tử trong `variants` | Hành vi |
|---|---|
| Có `id` | **Cập nhật** biến thể đó. Chỉ các trường được gửi mới đổi (`sku`, `size`, `color`, `colorHex`, `isActive`); trường không gửi giữ nguyên (`colorHex: null` = xóa mã màu) |
| Không có `id` | **Tạo biến thể mới**; bắt buộc đủ `sku`, `size`, `color` (`isActive` mặc định `true`) |
| Biến thể của sản phẩm **không có** trong danh sách | **Giữ nguyên** - không xóa, không vô hiệu hóa ngầm |

- **Mã màu nhất quán** được kiểm trên trạng thái **sau khi áp thay đổi**, gồm cả biến thể không có trong danh sách. Vì vậy muốn đổi hex
  của một màu thì phải gửi **tất cả biến thể cùng màu** với hex mới trong cùng một PATCH, nếu không → 400. Biến thể mới không gửi
  `colorHex` thì có hex `null` (không tự kế thừa từ biến thể cùng màu).
- Muốn ẩn một biến thể: gửi `{ "id": <id>, "isActive": false }` tường minh. Hiện lại: `isActive: true`.
- Không có cách xóa cứng biến thể.
- `variants` không gửi hoặc `[]` → không đụng tới biến thể nào.
- `id` phải thuộc chính sản phẩm này, nếu không → **400** `Biến thể #<id> không thuộc sản phẩm này`.
  Cùng một `id` xuất hiện hai lần → 400 `Biến thể #<id> xuất hiện nhiều lần trong danh sách`.
- Sau khi áp thay đổi, trong cùng danh sách gửi lên không được trùng SKU hoặc cặp (`size`, `color`) → 400. Nếu va chạm với biến thể
  khác của sản phẩm mà không có trong danh sách: SKU → 409 `SKU "<sku>" đã được sử dụng`, cặp size/màu → 409
  `Sản phẩm đã có biến thể size "<size>" màu "<color>"`. SKU trùng với biến thể của sản phẩm khác → 409.
- Sửa `sku`, `size`, `color` của biến thể đã có là được phép (để sửa lỗi nhập). Lưu ý giỏ hàng đang giữ biến thể đó sẽ thấy giá trị mới;
  đơn cũ không ảnh hưởng vì `OrderItem` lưu snapshot.
- **Hạn chế:** hoán đổi `size`/`color` giữa hai biến thể trong cùng một PATCH có thể vướng ràng buộc unique tạm thời → 409
  `Slug, SKU hoặc biến thể (size, màu) đã tồn tại`. Tách thành hai lần PATCH.
- Không nhận `stock`, `reserved`, `minStock`.
- Lỗi: 400, 401, 403, 404, 409.

### PATCH /admin/products/:id/status

Ẩn / hiện sản phẩm (xóa mềm).

Body: `{ "isActive": false }` (ẩn) hoặc `{ "isActive": true }` (hiện lại)

- **200**, `data` là chi tiết admin sau cập nhật.
- Chỉ đổi trạng thái sản phẩm, **không** đổi `isActive` của từng biến thể. Sản phẩm ẩn biến mất khỏi `GET /products` và
  `GET /products/:slug` (→ 404), vẫn xem/sửa được ở admin.
- Lỗi: 400 (`isActive` không phải boolean, id sai), 401, 403, 404.

## Validate

Mọi message bằng tiếng Việt. Lỗi trả theo từng trường trong `errors`; trường nằm trong biến thể ghi dạng `variants.<chỉ số>.<trường>`
(vd `variants.0.sku`).

### CreateProductDto

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `name` | Có | Chuỗi, bỏ khoảng trắng hai đầu, không rỗng, tối đa 191 ký tự | `Tên sản phẩm phải là chuỗi`, `Tên sản phẩm không được để trống`, `Tên sản phẩm không được vượt quá 191 ký tự` |
| `slug` | Không | Chuỗi, tối đa 191 ký tự, đúng dạng `^[a-z0-9]+(-[a-z0-9]+)*$` | `Slug phải là chuỗi`, `Slug không được vượt quá 191 ký tự`, `Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang` |
| `description` | Không | Chuỗi tối đa 10000 ký tự; `""` hoặc `null` = không có mô tả | `Mô tả phải là chuỗi`, `Mô tả không được vượt quá 10000 ký tự` |
| `price` | Có | Số nguyên 0 – 2147483647 (VND, JSON number, không nhận chuỗi `"199000"`) | `Giá phải là số nguyên (VND)`, `Giá không được âm`, `Giá không được vượt quá 2147483647` |
| `images` | Không | Mảng tối đa 6 phần tử `{ "url" }` (xem bảng ảnh dưới). Khi sửa: có gửi thì thay cả mảng | `images phải là một mảng`, `Mỗi sản phẩm tối đa 6 ảnh` |
| `imageUrl` | Không | **DEPRECATED**, chỉ để tương thích tạm (xem mục "Tương thích tạm"). URL ảnh. `http://` hoặc `https://`, **kể cả `localhost` hoặc IP có cổng** (vd `http://localhost:3000/uploads/products/x.webp`, URL do `POST /uploads/products` trả về ở dev, xem `docs/api/uploads.md`), **tối đa 500 ký tự** (cột VARCHAR(500)); `""` hoặc `null` = không có ảnh | `Đường dẫn ảnh phải là chuỗi`, `Đường dẫn ảnh không được vượt quá 500 ký tự`, `Đường dẫn ảnh không hợp lệ, phải bắt đầu bằng http:// hoặc https://` |
| `categoryId` | Có | Số nguyên ≥ 1 và danh mục phải tồn tại | `categoryId phải là số nguyên`, `categoryId phải lớn hơn hoặc bằng 1` (tồn tại: kiểm ở service, xem mục lỗi) |
| `variants` | Có | Mảng 1–100 phần tử | `variants phải là một mảng`, `Sản phẩm phải có ít nhất 1 biến thể`, `Sản phẩm không được vượt quá 100 biến thể` |

> **Giới hạn `imageUrl` cũ:** dài hơn 500 ký tự bị từ chối 400 (cột đã nới từ 191 lên 500).

### Ảnh (`images[]`)

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `assetId` | Một trong hai (`assetId` hoặc `url`) | Số nguyên ≥ 1: id ảnh do `POST /uploads/products` trả về. Có `assetId` thì `url` bị bỏ qua (lấy từ asset) | `assetId phải là số nguyên`, `assetId phải lớn hơn hoặc bằng 1` |
| `url` | Một trong hai | Bỏ khoảng trắng hai đầu, không rỗng, `http(s)`, tối đa 500 ký tự (xem quy tắc nguồn ảnh dưới). Không nhận trường nào khác (vd `sortOrder`) | `Đường dẫn ảnh phải là chuỗi`, `Đường dẫn ảnh không được để trống`, `Đường dẫn ảnh không được vượt quá 500 ký tự`, `Đường dẫn ảnh không hợp lệ, phải bắt đầu bằng http:// hoặc https://` |

**Nguồn ảnh hợp lệ** (kiểm ở `MediaService.resolveProductImages`):

1. `assetId`: ảnh `PRODUCT` còn `ACTIVE`. Sai/đã xóa/khác loại → 400 `MEDIA_ASSET_INVALID` (`errors[].field` = `images.<chỉ số>`).
2. `url` trùng URL gốc của ảnh đã tải lên (`secureUrl`): dùng ảnh đó (client cũ gửi lại `url` nhận được vẫn chạy).
3. `url` thuộc kho Cloudinary của hệ thống nhưng không có ảnh `ACTIVE` tương ứng → 400 `MEDIA_ASSET_INVALID` (không cho giả danh).
4. **URL ngoài** (vd picsum): chỉ `https://`, `assetId = null`, không do hệ thống quản lý. `ALLOW_EXTERNAL_IMAGE_URLS=false` thì bị từ chối 400 `EXTERNAL_IMAGE_NOT_ALLOWED`.

Khi PATCH thay/gỡ ảnh, ảnh cũ không còn ai dùng được đánh dấu xóa trong cùng transaction và xóa phía Cloudinary sau commit (xem `uploads.md`, "Xóa và dọn ảnh").
Ảnh còn được **đơn hàng cũ** tham chiếu (snapshot `imagePublicId`) **không** bị xóa.

Lỗi validate nằm ở `images.<chỉ số>.url` hoặc `images.<chỉ số>.assetId`. URL trùng trong mảng báo ở service (400, không có `field`).

### Biến thể (`variants[]` khi tạo)

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `sku` | Có | Bỏ khoảng trắng hai đầu, đổi thành chữ in hoa, tối đa 64 ký tự, chỉ gồm `A-Z 0-9 . _ -` | `SKU phải là chuỗi`, `SKU không được để trống`, `SKU không được vượt quá 64 ký tự`, `SKU chỉ gồm chữ cái không dấu, số và các ký tự . _ -` |
| `size` | Có | Chuỗi, bỏ khoảng trắng hai đầu, không rỗng, tối đa 50 ký tự | `Size phải là chuỗi`, `Size không được để trống`, `Size không được vượt quá 50 ký tự` |
| `color` | Có | Như `size` | `Màu sắc phải là chuỗi`, `Màu sắc không được để trống`, `Màu sắc không được vượt quá 50 ký tự` |
| `colorHex` | Không | Mã màu `#RRGGBB`; bỏ khoảng trắng hai đầu, đổi thành in hoa; `""`/`null` = chưa có. Cùng màu trong một sản phẩm phải cùng mã | `Mã màu phải là chuỗi`, `Mã màu phải có dạng #RRGGBB (ví dụ #FFFFFF)` |
| `isActive` | Không | boolean, mặc định `true` | `isActive phải là true hoặc false` |

### UpdateProductDto

Gồm `name`, `slug`, `description`, `price`, `imageUrl`, `images`, `categoryId` (tất cả tùy chọn, giữ quy tắc như bảng trên khi có gửi,
vd `{"name":""}` vẫn bị 400) và `variants` (tùy chọn, tối đa 100 phần tử, message `Mỗi lần chỉ gửi tối đa 100 biến thể`).
Phần tử `variants[]`:

| Trường | Quy tắc |
|---|---|
| `id` | Tùy chọn. Số nguyên ≥ 1 (`id biến thể phải là số nguyên`, `id biến thể phải lớn hơn hoặc bằng 1`) |
| `sku`, `size`, `color` | **Bắt buộc khi không có `id`**; khi có `id` thì tùy chọn nhưng nếu gửi phải hợp lệ (không rỗng, không `null`). Quy tắc và message như bảng biến thể |
| `colorHex` | Tùy chọn; không gửi = giữ nguyên, `null`/`""` = xóa mã. Quy tắc như bảng biến thể |
| `isActive` | Tùy chọn, boolean |

### UpdateProductStatusDto

| Trường | Bắt buộc | Message khi sai |
|---|---|---|
| `isActive` | Có | `isActive phải là true hoặc false` |

### Query

| Trường | Message khi sai |
|---|---|
| `q` | `Từ khóa tìm kiếm phải là chuỗi` |
| `categoryId` | `categoryId phải là số nguyên`, `categoryId phải lớn hơn hoặc bằng 1` |
| `minPrice` (public) | `minPrice phải là số nguyên`, `minPrice phải lớn hơn hoặc bằng 0`, `minPrice không được vượt quá 2147483647` |
| `maxPrice` (public) | `maxPrice phải là số nguyên`, `maxPrice phải lớn hơn hoặc bằng 0`, `maxPrice không được vượt quá 2147483647`, `maxPrice phải lớn hơn hoặc bằng minPrice` |
| `excludeId` (public) | `excludeId phải là số nguyên`, `excludeId phải lớn hơn hoặc bằng 1` |
| `isActive` (admin) | `isActive phải là true hoặc false` |
| `sortBy` | `sortBy phải là createdAt, price hoặc name` |
| `order` | `order phải là asc hoặc desc` |
| `page` | `page phải là số nguyên`, `page phải lớn hơn hoặc bằng 1` |
| `limit` | `limit phải là số nguyên`, `limit phải lớn hơn hoặc bằng 1`, `limit không được vượt quá 100` (admin) / `limit không được vượt quá 48` (public) |

### Trường lạ

`ValidationPipe` bật `whitelist`, `forbidNonWhitelisted`, `transform`: trường thừa trong body hoặc query bị **từ chối 400**,
`errors` có `{ "field": "foo", "message": "Trường foo không được phép gửi lên" }` (kể cả trong biến thể, vd `variants.0.stock`).

## Response lỗi

| Status | Khi nào |
|---|---|
| 400 | Validate sai; `ID không hợp lệ`; `Danh mục với ID #<id> không tồn tại`; `Tên sản phẩm phải chứa ít nhất một chữ cái hoặc chữ số`; `SKU "<sku>" bị trùng trong danh sách biến thể`; `Size "<size>" màu "<color>" bị trùng trong danh sách biến thể`; `Biến thể #<id> không thuộc sản phẩm này`; `Biến thể #<id> xuất hiện nhiều lần trong danh sách`; `Ảnh "<url>" bị trùng trong danh sách ảnh`; `images phải là một mảng` (khi `images: null`); `Màu "<màu>" có hai mã màu khác nhau (<mã 1> và <mã 2>). Các biến thể cùng màu phải dùng chung một mã màu` |
| 401 | Thiếu token / token sai: `Bạn chưa đăng nhập hoặc phiên đăng nhập không hợp lệ`; token hết hạn: `Phiên đăng nhập đã hết hạn` |
| 403 | `Bạn không có quyền thực hiện thao tác này` |
| 404 | Admin: `Không tìm thấy sản phẩm với ID #<id>`; public: `Không tìm thấy sản phẩm`; đường dẫn không tồn tại (kể cả `DELETE`) |
| 409 | `Slug "<slug>" đã được sử dụng`; `SKU "<sku>" đã được sử dụng`; `Sản phẩm đã có biến thể size "<size>" màu "<color>"` |
| 500 | Lỗi không lường trước: `Lỗi hệ thống, vui lòng thử lại sau` |

Ví dụ 409 trùng SKU:

```json
{ "success": false, "statusCode": 409, "message": "SKU \"ATB-S-TRANG\" đã được sử dụng" }
```

Ví dụ 400 validate biến thể:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dữ liệu không hợp lệ",
  "errors": [{ "field": "variants.0.size", "message": "Size không được để trống" }]
}
```

### Ánh xạ lỗi Prisma (lớp dự phòng)

Service tự kiểm tra trước; các mã dưới đây chỉ xuất hiện khi hai request chạy đua nhau (hoặc trường hợp hoán đổi size/màu ở trên):

| Mã Prisma | Trả về |
|---|---|
| P2002 (trùng unique) | 409 `SKU đã được sử dụng` / `Slug đã được sử dụng` / `Slug, SKU hoặc biến thể (size, màu) đã tồn tại` |
| P2003 (khóa ngoại) | 409 `Dữ liệu liên quan không hợp lệ hoặc đang được sử dụng` |
| P2025 (không tìm thấy) | 404 |

Ràng buộc CHECK của DB (`price >= 0`, tồn kho không âm...) được chặn trước ở validate; API này không ghi `stock`/`reserved` nên không chạm tới.

## Dữ liệu mẫu (seed)

`npx prisma db seed` (không tự chạy) tạo thêm 10 sản phẩm kèm biến thể (52 biến thể, tồn kho 20, cứ 5 biến thể có 1 biến thể `stock = 0`), trong đó 1 sản phẩm đang ẩn
(`quan-short-the-thao`). Sản phẩm gắn vào các danh mục theo slug: `ao-thun`, `ao-so-mi`, `quan-jean`, `quan-short`.
Danh mục nào chưa có slug đó thì seed tạo thêm (cùng `ao`, `quan` làm cha); danh mục đã có thì dùng lại, không ghi đè.
Chạy lại an toàn: slug đã có thì bỏ qua.

## Ví dụ curl

```bash
BASE=http://localhost:3000

# Đăng nhập lấy accessToken (thay email/mật khẩu cho từng role)
ADMIN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@gmail.com","password":"<mật khẩu>"}' | jq -r .data.accessToken)
STAFF=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"staff@gmail.com","password":"<mật khẩu>"}' | jq -r .data.accessToken)
CUSTOMER=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"customer@gmail.com","password":"<mật khẩu>"}' | jq -r .data.accessToken)

# Public: không cần token
curl -s "$BASE/products?categoryId=1&sortBy=price&order=asc&page=1&limit=10"
curl -s "$BASE/products?minPrice=100000&maxPrice=300000&sortBy=price&order=asc"
curl -s "$BASE/products?categoryId=1&excludeId=1&limit=8"   # sản phẩm liên quan
curl -s -i "$BASE/products?isActive=false"                  # 400: public không nhận isActive
curl -s $BASE/products/ao-thun-basic-co-tron

# Không token → 401; CUSTOMER → 403
curl -s -i $BASE/admin/products
curl -s -i $BASE/admin/products -H "Authorization: Bearer $CUSTOMER"

# STAFF xem danh sách (lọc sản phẩm đang ẩn) / chi tiết → 200
curl -s "$BASE/admin/products?isActive=false&q=short&sortBy=price&order=asc" -H "Authorization: Bearer $STAFF"
curl -s $BASE/admin/products/1 -H "Authorization: Bearer $STAFF"

# STAFF tạo sản phẩm kèm 2 biến thể → 201 (slug tự sinh: ao-khoac-gio)
curl -s -X POST $BASE/admin/products -H "Authorization: Bearer $STAFF" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Áo khoác gió","price":399000,"categoryId":1,
       "variants":[{"sku":"akg-m-den","size":"M","color":"Đen"},{"sku":"akg-l-den","size":"L","color":"Đen"}]}'

# Sửa: đổi giá, ẩn biến thể 10, sửa SKU biến thể 11, thêm biến thể mới (không có id)
curl -s -X PATCH $BASE/admin/products/1 -H "Authorization: Bearer $STAFF" \
  -H 'Content-Type: application/json' \
  -d '{"price":219000,"variants":[{"id":10,"isActive":false},{"id":11,"sku":"ATB-M-TRANG-V2"},{"sku":"ATB-XL-TRANG","size":"XL","color":"Trắng"}]}'

# Ẩn sản phẩm rồi kiểm tra public (→ 404), hiện lại
curl -s -X PATCH $BASE/admin/products/1/status -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"isActive":false}'
curl -s -i $BASE/products/ao-thun-basic-co-tron
curl -s -X PATCH $BASE/admin/products/1/status -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"isActive":true}'

# categoryId không tồn tại → 400
curl -s -X POST $BASE/admin/products -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Thử","price":1000,"categoryId":99999,"variants":[{"sku":"T-1","size":"M","color":"Đen"}]}'
```
