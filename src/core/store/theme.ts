/**
 * Dark, light or system. The player's word (companion plugin) rules every screen when it is
 * there; a browser's own choice lives in localStorage otherwise, and `?theme=` in the address
 * sets it on the first load (a display nobody can touch).
 */
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';
const KEY = 'aw-theme';

interface ThemeStore {
  choice: ThemeMode | null;
  followed: ThemeMode | null;
  forced: boolean;
  mode: () => ThemeMode;
  isLight: () => boolean;
  set: (m: ThemeMode) => void;
  follow: (m: ThemeMode, forced: boolean) => void;
  unfollow: () => void;
}

function read(): ThemeMode | null {
  try {
    const q = new URLSearchParams(window.location.search).get('theme');
    if (q === 'dark' || q === 'light' || q === 'system') { localStorage.setItem(KEY, q); return q; }
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' || v === 'system' ? v : null;
  } catch { return null; }
}

function apply(mode: ThemeMode) {
  document.documentElement.setAttribute('data-aw-theme', mode);
  const light = mode === 'light' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.classList.toggle('aw-is-light', light);
}

export const useTheme = create<ThemeStore>((set, get) => ({
  choice: read(),
  followed: null,
  forced: false,
  mode: () => { const s = get(); return (s.forced && s.followed) ? s.followed : (s.choice || s.followed || 'dark'); },
  isLight: () => { const m = get().mode(); return m === 'light' || (m === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches); },
  set: (m) => { try { localStorage.setItem(KEY, m); } catch { /* private mode */ } set({ choice: m }); apply(get().mode()); },
  follow: (m, forced) => { set({ followed: m, forced }); apply(get().mode()); },
  unfollow: () => { set({ followed: null, forced: false }); apply(get().mode()); },
}));

apply(useTheme.getState().mode());
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => apply(useTheme.getState().mode()));
window.addEventListener('storage', (e) => { if (e.key === KEY) { useTheme.setState({ choice: read() }); apply(useTheme.getState().mode()); } });
