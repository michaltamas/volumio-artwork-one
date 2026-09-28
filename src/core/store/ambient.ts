/**
 * Ambient: the display's resting state — the settings, the kiosk question and the idle timer.
 * Settings live in this browser (`aw-ambient`) unless the companion plugin holds the player's.
 */
import { create } from 'zustand';
import { KIOSK } from '../kiosk';

const KEY = 'aw-ambient';
export const DELAYS = [1, 2, 5, 10, 0];
export const LAYOUTS = ['cover', 'clock', 'bleed'] as const;
export interface AmbientSettings { on: boolean; delay: number; layout: 'cover' | 'clock' | 'bleed'; clock: '12' | '24'; night: boolean; nightFrom: string; nightTo: string }
const DEFAULTS: AmbientSettings = { on: true, delay: 2, layout: 'cover', clock: '24', night: true, nightFrom: '23:00', nightTo: '07:00' };
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

interface AmbientStore {
  settings: AmbientSettings; active: boolean; remote: boolean; kiosk: boolean;
  enabled: () => boolean; set: (patch: Partial<AmbientSettings>) => void; adopt: (remote: any) => void; revert: () => void;
  enter: () => void; exit: () => void; isNight: () => boolean;
}
function clean(saved: any): AmbientSettings {
  const s = { ...DEFAULTS, ...(saved || {}) } as AmbientSettings;
  if (DELAYS.indexOf(s.delay) < 0) { s.delay = DEFAULTS.delay; }
  if ((LAYOUTS as readonly string[]).indexOf(s.layout) < 0) { s.layout = DEFAULTS.layout; }
  if (s.clock !== '12' && s.clock !== '24') { s.clock = DEFAULTS.clock; }
  return s;
}
function read(): AmbientSettings { try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return { ...DEFAULTS }; } }
const minutes = (hhmm: any) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); if (!m) { return null; } const h = +m[1], mi = +m[2]; return h > 23 || mi > 59 ? null : h * 60 + mi; };

let idle: number | null = null; let lastMove = 0;
function arm() {
  if (idle) { window.clearTimeout(idle); idle = null; }
  const st = useAmbient.getState();
  if (!st.enabled() || st.active) { return; }
  idle = window.setTimeout(() => useAmbient.getState().enter(), st.settings.delay * 60 * 1000);
}

export const useAmbient = create<AmbientStore>((set, get) => ({
  settings: read(), active: false, remote: false, kiosk: KIOSK,
  enabled: () => get().settings.on && get().settings.delay > 0 && get().kiosk,
  set: (patch) => { const s = { ...get().settings, ...patch }; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* nothing to remember it with */ } set({ settings: s }); arm(); },
  adopt: (remote) => { set({ settings: clean(remote), remote: true }); if (get().active) { get().exit(); } arm(); },
  revert: () => { set({ settings: read(), remote: false }); arm(); },
  enter: () => { if (get().active) { return; } set({ active: true }); document.documentElement.setAttribute('data-aw-ambient', ''); },
  exit: () => { if (!get().active) { return; } set({ active: false }); document.documentElement.removeAttribute('data-aw-ambient'); arm(); },
  isNight: () => { const s = get().settings; if (!s.night) { return false; } const from = minutes(s.nightFrom), to = minutes(s.nightTo); if (from === null || to === null || from === to) { return false; } const d = new Date(), now = d.getHours() * 60 + d.getMinutes(); return from < to ? (now >= from && now < to) : (now >= from || now < to); },
}));

const onActivity = (e: Event) => {
  const st = useAmbient.getState();
  if (st.active) { if (e.type === 'pointermove') { return; } e.preventDefault(); e.stopPropagation(); st.exit(); return; }
  if (e.type === 'pointermove') { const now = Date.now(); if (now - lastMove < 1000) { return; } lastMove = now; }
  arm();
};
ACTIVITY.forEach(t => window.addEventListener(t, onActivity, { passive: false, capture: true }));
window.addEventListener('storage', (e) => { if (e.key !== KEY) { return; } useAmbient.setState({ settings: read() }); if (useAmbient.getState().active) { useAmbient.getState().exit(); } arm(); });
arm();
if (/[?&]ambient=now\b/.test(window.location.href)) { window.setTimeout(() => useAmbient.getState().enter(), 1200); }
