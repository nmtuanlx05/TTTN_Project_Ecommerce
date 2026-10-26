import { Monitor, Moon, Sun } from "lucide-react"
import type { ThemeChoice } from "@/hooks/use-theme"

/** Ba chế độ hiển thị, theo thứ tự xoay vòng của nút mobile. */
export const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
]
