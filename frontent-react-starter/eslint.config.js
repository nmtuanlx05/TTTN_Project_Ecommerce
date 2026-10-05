import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
