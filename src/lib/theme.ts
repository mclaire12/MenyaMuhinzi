export type Theme = "light" | "dark";

const KEY = "mm-theme";

export function readTheme(): Theme {
  if (typeof localStorage === "undefined") return "light";
  return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* private mode */ }
}
