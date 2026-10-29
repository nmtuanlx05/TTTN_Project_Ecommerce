# Quy trình Git

Áp dụng cho cả hai thư mục `backend-nestjst-starter` và `frontent-react-starter` (cùng một git repo).

## 1. Format commit (Conventional Commits, tiếng Anh)

```
<type>(<scope>): <subject>

<body: giải thích "vì sao", mỗi dòng ≤ 100 ký tự>

<footer: BREAKING CHANGE: ..., Co-Authored-By: ...>
```

- **type**: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
- **subject**: thể mệnh lệnh, viết thường, không dấu chấm cuối, ≤ 72 ký tự.
- **scope**: tùy chọn, không bắt buộc cứng. Nếu dùng thì lấy trong danh sách dưới đây:
  - Backend: `auth`, `users`, `categories`, `common`, `config`, `prisma` (schema, migration, seed), `test`.
    Module sắp làm: `products`, `variants`, `carts`, `orders`, `vouchers`, `inventory`, `payments`.
  - Frontend: `web` (chung), `admin`, `storefront`, `ui`.
  - Chung: `git`, `docker`, `deps`.
- Thay đổi phá vỡ tương thích: thêm `!` sau scope và/hoặc ghi `BREAKING CHANGE:` ở footer.

| Đúng | Sai |
|---|---|
| `feat(categories): add soft delete endpoint` | `update code` (không có type, không rõ nội dung) |
| `fix(auth): reject login for inactive user` | `Fix(auth): Rejected login.` (viết hoa, quá khứ, có dấu chấm) |
| `docs(git): add git workflow guide` | `feat: thêm module sản phẩm` (subject tiếng Việt) |
| `refactor(users): extract password omit helper` | `feat(users): add endpoint, fix bug, update ui` (nhiều thay đổi trong một commit) |

## 2. Tên nhánh

`<type>/<tên-kebab-case>`, với type là `feat`, `fix`, `docs`, `chore`, `refactor`.
Ví dụ: `feat/products-crud`, `fix/users-role-guard`, `docs/git-workflow`.

**Một tính năng = một nhánh**, chứa cả backend và frontend của tính năng đó (không tách nhánh riêng cho từng phía).

## 3. Quy trình cho mỗi tính năng

1. **Tạo nhánh từ `main`** mới nhất: `git switch main && git pull && git switch -c feat/<tên-tính-năng>`.
2. **Commit nhỏ** trong cùng nhánh, backend trước, frontend sau (xem thứ tự ở dưới). Mỗi commit một thay đổi logic.
   Frontend đọc tài liệu API (`backend-nestjst-starter/docs/api/<module>.md`) trực tiếp từ working tree, không cần chờ
   backend merge.
3. **Push một lần** cho cả nhánh: `git push -u origin feat/<tên-tính-năng>`.
4. **Mở một Pull Request** vào `main` cho cả tính năng, mô tả ngắn thay đổi và cách kiểm tra.
5. **Merge bằng merge commit (`--no-ff`)** để giữ nguyên các commit nhỏ: nút "Create a merge commit" trên GitHub,
   hoặc `git switch main && git merge --no-ff feat/<tên-tính-năng>`. Không dùng squash.
6. **Xóa nhánh** sau khi merge: `git branch -d feat/<tên-tính-năng>` và `git push origin --delete feat/<tên-tính-năng>`.

Trước khi commit phải chạy `npm run lint`, `npm run build`, `npm test` (backend) hoặc `npm run lint`, `npm run build` (frontend).

## 4. Thứ tự commit trong nhánh

1. **Backend trước:** schema/migration → code (module, service, controller) → test → docs (`docs/api/...`).
2. **Frontend sau:** docs → hạ tầng/component dùng chung → tính năng.

## 5. Đề xuất commit (dành cho Claude, người dùng tự chạy)

- Mỗi file thuộc **đúng một** commit. Các commit xếp theo thứ tự phụ thuộc và **mỗi commit phải build được độc lập**.
- Chỉ add cả file: **không** dùng `git add -p` hay `git add -N`.
- Mỗi nhóm lệnh ghi rõ `cd` vào thư mục backend hoặc frontend. Giả định đang đứng ở thư mục gốc repo, nên nhóm
  frontend sau nhóm backend dùng `cd ../frontent-react-starter`.
- Mỗi commit dùng nhiều tham số `-m` (tiêu đề, phần giải thích, dòng `Co-Authored-By`), không dùng chuỗi nhiều dòng.
- Cuối đề xuất có bước `git status`, kết quả phải sạch (`nothing to commit, working tree clean`).
- Mỗi phiên chỉ đề xuất add các file của chính phần mình. Nếu working tree đang có file đã staged từ phần khác thì nhắc
  người dùng chạy `git restore --staged :/` trước.

```bash
cd backend-nestjst-starter
git add prisma/schema.prisma prisma/migrations/<tên-migration>
git commit -m "feat(prisma): add avatar_url to users" \
  -m "Store the avatar path so the admin table can show it." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"

cd ../frontent-react-starter
git add src/features/users/api.ts
git commit -m "feat(users): call avatar upload endpoint" \
  -m "Wrap the new backend endpoint in the users api layer." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"

git status
```

## 6. Không làm

- Không commit `.env`, `.env.development`, `.env.production` hay bất kỳ file chứa secret. Chỉ commit `.env.example` với giá trị placeholder.
- Không force push (`--force`) lên `main`.
- Không commit code không build được.
- Không dùng `git add -A` / `git add .` mà không kiểm tra lại `git status`.
- Không sửa lịch sử đã push (rebase, amend commit đã push).
