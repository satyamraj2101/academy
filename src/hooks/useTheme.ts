import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cn-theme';

function readStoredTheme(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'light';
  } catch {
    return 'light';
  }
}

// Single source of truth for light/dark mode across the whole app — persists
// to localStorage and toggles the 'dark' class on <html>, which is the one
// ancestor common to every route (the marketing site's own header/footer
// wrapper and bare-layout routes like the Course Player are separate React
// trees, so a toggle scoped to a local div only affects its own subtree).
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
