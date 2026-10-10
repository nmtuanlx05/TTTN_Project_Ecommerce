import { readdirSync } from 'node:fs'
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

// File được miễn từng quy tắc theo gói (xem khối "Import bị cấm" bên dưới).
const AXIOS_EXEMPT = ['src/lib/api-client.ts', 'src/lib/api-error.ts', 'src/features/*/api.ts']
const CN_EXEMPT = ['src/lib/utils.ts']

const FEATURES = readdirSync('src/features', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const boundary = (group, message) => ({ group, message })

/**
 * Khối ranh giới thư mục cho `files`. `no-restricted-imports` của khối sau ghi đè
 * hoàn toàn khối trước, nên khối này phải khai báo lại quy tắc axios/cn: mặc định
 * cấm cả hai, riêng file trong `axiosExempt`/`cnExempt` thì chỉ cấm cái còn lại.
 */
function zone(files, patterns, { axiosExempt = [], cnExempt = [] } = {}) {
  const rule = (paths) => ({
    'no-restricted-imports': ['error', { paths, patterns }],
  })
  const blocks = [
    {
      files,
      ignores: [...axiosExempt, ...cnExempt],
      rules: rule([AXIOS_RULE, CN_RULE]),
    },
  ]
  if (axiosExempt.length > 0) blocks.push({ files: axiosExempt, rules: rule([CN_RULE]) })
  if (cnExempt.length > 0) blocks.push({ files: cnExempt, rules: rule([AXIOS_RULE]) })
  return blocks
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
  // Import bị cấm, hai loại (xem "Quy ước gọi API" trong CLAUDE.md và docs/cau-truc-thu-muc.md mục 4):
  // - Theo tên gói: axios (chỉ lớp API; component đi qua hook trong queries.ts) và
  //   "cn" (chỉ src/lib/utils.ts, nơi cấu hình cn() cho cỡ chữ tùy biến; import thẳng
  //   từ gói "cn" sẽ bỏ qua cấu hình đó và xóa nhầm class màu chữ).
  // - Theo ranh giới thư mục: pages → features → components → lib/hooks/types, không
  //   đi ngược, và features không import lẫn nhau. Chỉ bắt import qua alias "@/".
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [...AXIOS_EXEMPT, ...CN_EXEMPT],
    rules: { 'no-restricted-imports': ['error', { paths: [AXIOS_RULE, CN_RULE] }] },
  },
  {
    files: AXIOS_EXEMPT,
    rules: { 'no-restricted-imports': ['error', { paths: [CN_RULE] }] },
  },
  {
    files: CN_EXEMPT,
    rules: { 'no-restricted-imports': ['error', { paths: [AXIOS_RULE] }] },
  },
  // components/** (kể cả ui) không biết gì về tính năng hay trang.
  ...zone(['src/components/**/*.{ts,tsx}'], [
    boundary(
      ['@/features/*', '@/pages/*'],
      'components/ không được import features/ hay pages/. Thứ riêng của tính năng nằm trong features/<tên>/.',
    ),
  ]),
  // lib, hooks, types là tầng dưới cùng.
  ...zone(
    ['src/lib/**/*.{ts,tsx}'],
    [
      boundary(
        ['@/components/*', '@/features/*', '@/pages/*'],
        'lib/ không được import components/, features/ hay pages/ (chiều phụ thuộc không đi ngược).',
      ),
    ],
    {
      axiosExempt: ['src/lib/api-client.ts', 'src/lib/api-error.ts'],
      cnExempt: ['src/lib/utils.ts'],
    },
  ),
  ...['hooks', 'types'].flatMap((dir) =>
    zone(
      [`src/${dir}/**/*.{ts,tsx}`],
      [
        boundary(
          ['@/components/*', '@/features/*', '@/pages/*'],
          `${dir}/ không được import components/, features/ hay pages/ (chiều phụ thuộc không đi ngược).`,
        ),
      ],
    ),
  ),
  // features/<tên>/ không import pages/ và không import feature khác. Danh sách
  // feature lấy từ thư mục nên feature mới tự được áp dụng.
  ...FEATURES.flatMap((name) =>
    zone(
      [`src/features/${name}/**/*.{ts,tsx}`],
      [
        boundary(['@/pages/*'], 'features/ không được import pages/.'),
        boundary(
          ['@/features/**', `!@/features/${name}`, `!@/features/${name}/**`],
          'features/ không import lẫn nhau. Thứ hai feature cùng cần thì đưa lên components/ hoặc lib/.',
        ),
      ],
      { axiosExempt: [`src/features/${name}/api.ts`] },
    ),
  ),
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
