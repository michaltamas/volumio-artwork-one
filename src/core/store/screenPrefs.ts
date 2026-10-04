/**
 * What a screen keeps for itself (not the player's settings, which the companion holds): the size
 * of Now Playing's text — for a display with an unusual shape, where the default reads too small —
 * and whether the volume control is shown at all, for whoever sets the volume on the amplifier.
 * localStorage; applied as attributes on <html> so the stylesheet does the rest.
 */
import { create } from 'zustand';

export type TextSize = 'm' | 'l' | 'xl' | 's';
interface ScreenPrefs { textSize: TextSize; hideVolume: boolean; setTextSize: (s: TextSize) => void; setHideVolume: (on: boolean) => void }

const KEY = 'aw-screen-prefs';
const read = (): { textSize: TextSize; hideVolume: boolean } => {
  try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { textSize: ['s', 'm', 'l', 'xl'].includes(o.textSize) ? o.textSize : 'm', hideVolume: o.hideVolume === true }; } catch { return { textSize: 'm', hideVolume: false }; }
};
const apply = (p: { textSize: TextSize; hideVolume: boolean }) => {
  const h = document.documentElement;
  if (p.textSize === 'm') { h.removeAttribute('data-aw-text'); } else { h.setAttribute('data-aw-text', p.textSize); }
  h.classList.toggle('aw-no-volume', p.hideVolume);
};
const save = (p: { textSize: TextSize; hideVolume: boolean }) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* not remembered */ } apply(p); };

export const useScreenPrefs = create<ScreenPrefs>((set, get) => ({
  ...read(),
  setTextSize: (textSize) => { set({ textSize }); save({ textSize, hideVolume: get().hideVolume }); },
  setHideVolume: (hideVolume) => { set({ hideVolume }); save({ textSize: get().textSize, hideVolume }); },
}));
apply(read());
window.addEventListener('storage', (e) => { if (e.key === KEY) { const p = read(); useScreenPrefs.setState(p); apply(p); } });
