import { useCallback, useEffect, useState } from "react";

/** Lựa chọn của người dùng. "system" = đi theo cài đặt hệ điều hành. */
export type ThemeChoice = "light" | "dark" | "system";

/** Chế độ thực sự đang hiển thị sau khi đã phân giải "system". */
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // localStorage bị chặn — coi như chưa chọn gì
  }
  return "system";
}

function readSystemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function useTheme() {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice);
  const [systemDark, setSystemDark] = useState<boolean>(readSystemDark);

  // Tính trong lúc render, không giữ thành state riêng — nhờ vậy không có
  // vòng render thừa và hai nguồn sự thật không bao giờ lệch nhau.
  const resolved: ResolvedTheme =
    choice === "system" ? (systemDark ? "dark" : "light") : choice;

  // Ghi class lên <html>. Script trong index.html đã làm việc này một lần
  // trước khi React mount, nên không có nhấp nháy khi tải trang.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved]);

  // Theo dõi hệ điều hành đổi chế độ
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Không lưu được thì vẫn đổi được trong phiên hiện tại
    }
  }, []);

  return { choice, resolved, setChoice };
}
