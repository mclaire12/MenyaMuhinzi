import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  useLayoutEffect(() => { const stored = readTheme(); applyTheme(stored); setThemeState(stored); }, []);
  const setTheme = (next: Theme) => { applyTheme(next); setThemeState(next); };
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return <Button type="button" variant="ghost" size="icon" aria-label={dark ? "Hindura ku buryo bworoshye" : "Hindura ku buryo bw'umukara"} title={dark ? "Light mode" : "Dark mode"} onClick={() => setTheme(dark ? "light" : "dark")}>{dark ? <Sun aria-hidden /> : <Moon aria-hidden />}</Button>;
}
