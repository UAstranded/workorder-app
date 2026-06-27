import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { themes, getTheme, ThemeDef } from '../themes';

interface ThemeContextType {
  theme: ThemeDef;
  isDark: boolean;
  setThemeName: (name: string) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getStoredThemeName(): string {
  try {
    return localStorage.getItem('theme-name') || 'default';
  } catch {
    return 'default';
  }
}

function getStoredIsDark(): boolean {
  try {
    const stored = localStorage.getItem('dark-mode');
    if (stored !== null) return stored === 'true';
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<string>(getStoredThemeName);
  const [isDark, setIsDark] = useState<boolean>(getStoredIsDark);

  const setThemeName = useCallback((name: string) => {
    setThemeNameState(name);
    try { localStorage.setItem('theme-name', name); } catch {}
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      try { localStorage.setItem('dark-mode', String(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName);
    root.classList.toggle('dark', isDark);
  }, [themeName, isDark]);

  const theme = getTheme(themeName);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setThemeName, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
