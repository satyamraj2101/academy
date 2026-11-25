import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cn-theme';

function readStoredTheme(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// One shared theme for the whole app. Every component that calls useTheme() reads and changes this same value, so the
// header toggle, the Course Player's toggle and the page wrapper can never disagree. It persists to localStorage and
// toggles the 'dark' class on <html>, the one ancestor common to every route (the marketing site's own header/footer
// wrapper and bare-layout routes like the Course Player are separate React trees).
let current: Theme = readStoredTheme();
const listeners = new Set<() => void>();

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* private mode */ }
}

function setTheme(next: Theme) {
  if (next === current) return;
  current = next;
  apply(current);
  listeners.forEach(l => l());
}

apply(current);

// Another tab changed the theme.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) setTheme(e.newValue === 'dark' ? 'dark' : 'light');
  });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'light' as Theme);
  const toggleTheme = useCallback(() => setTheme(current === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggleTheme };
}
