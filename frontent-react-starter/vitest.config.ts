import path from "node:path"
import { defineConfig } from "vitest/config"

// Test thuần logic (không DOM, không React): chạy bằng Node. Tách khỏi vite.config.ts để khỏi nạp plugin React/Tailwind.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
})
