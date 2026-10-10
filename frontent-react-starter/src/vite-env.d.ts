/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Địa chỉ gốc của backend, ví dụ http://localhost:3000 */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
