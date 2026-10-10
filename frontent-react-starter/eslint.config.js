import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const AXIOS_RULE = {
  name: 'axios',
  message:
    'Không gọi axios trực tiếp. Viết hàm trong features/<module>/api.ts và hook trong queries.ts.',
}
const CN_RULE = {
  name: 'cn',
  message: 'Import cn từ "@/lib/utils" để dùng bản đã cấu hình cỡ chữ tùy biến.',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Hai import bị cấm ngoài nơi được phép (xem "Quy ước gọi API" trong CLAUDE.md):
  // - axios: chỉ lớp API; component đi qua hook trong queries.ts.
  // - "cn": chỉ src/lib/utils.ts, nơi cấu hình cn() cho cỡ chữ tùy biến. Import
  //   thẳng từ gói "cn" sẽ bỏ qua cấu hình đó và xóa nhầm class màu chữ.
  // Mỗi nhóm file cần một khối riêng vì `no-restricted-imports` của khối sau
  // ghi đè hoàn toàn khối trước.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/api-client.ts',
      'src/lib/api-error.ts',
      'src/features/*/api.ts',
      'src/lib/utils.ts',
    ],
    rules: { 'no-restricted-imports': ['error', { paths: [AXIOS_RULE, CN_RULE] }] },
  },
  {
    files: ['src/lib/api-client.ts', 'src/lib/api-error.ts', 'src/features/*/api.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: [CN_RULE] }] },
  },
  {
    files: ['src/lib/utils.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: [AXIOS_RULE] }] },
  },
  {
    // src/components/ui là thư mục do `shadcn add` sinh ra và sẽ bị ghi đè.
    // Quy ước của shadcn là xuất biến thể (buttonVariants, badgeVariants…)
    // ngay cạnh component, nên react-refresh/only-export-components luôn kêu.
    // Tắt riêng cho thư mục này thay vì sửa trái quy ước rồi mất khi regenerate.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
