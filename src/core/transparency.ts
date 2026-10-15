/**
 * Transparency: the frosted glass (bars, panels, menus blurring what is under them) or solid surfaces.
 * The blur is the heaviest thing the theme asks a screen to draw — a slow tablet, the Android app or the
 * player's own HDMI display scroll smoother without it. A choice of each screen: this browser keeps its own
 * (the system's "reduce transparency" until it is set here); the player's display takes the one saved with
 * the ambient settings, so it can be set from a phone.
 */
import { create } from 'zustand';
import { KIOSK } from './kiosk';
import { useAmbient } from './store/ambient';

const KEY = 'aw-transparency';
const REDUCE = '(prefers-reduced-transparency: reduce)';

function stored(): boolean | null { try { const v = localStorage.getItem(KEY); return v === 'on' ? true : v === 'off' ? false : null; } catch { return null; } }
function systemReduces(): boolean { try { return window.matchMedia(REDUCE).matches; } catch { return false; } }

interface TransparencyStore { on: boolean; set: (on: boolean) => void }

export const useTransparency = create<TransparencyStore>((set) => ({
  on: stored() ?? !systemReduces(),
  set: (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* remembered for this visit only */ } set({ on }); },
}));

// what this screen draws: the display follows the player's setting, every other screen its own
function apply() {
  const on = KIOSK ? useAmbient.getState().settings.transparency : useTransparency.getState().on;
  document.documentElement.toggleAttribute('data-aw-solid', !on);
}
useTransparency.subscribe(apply);
useAmbient.subscribe((st, prev) => { if (st.settings.transparency !== prev.settings.transparency) { apply(); } });
try { window.matchMedia(REDUCE).addEventListener('change', () => { if (stored() === null) { useTransparency.setState({ on: !systemReduces() }); } }); } catch { /* an older engine */ }
apply();
