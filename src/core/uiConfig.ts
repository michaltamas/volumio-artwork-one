/**
 * One queue for `getUiConfig`: the player answers every ask with a `pushUiConfig` and says
 * nothing about which page it is, and it answers in the order it finishes them, not the order
 * they came. Asking through here sends one ask at a time, so every answer is the one in flight
 * and lands on its own page — never on an open settings form.
 */
import { on, emit } from './socket';

type Listener = (page: string | null, cfg: any) => void;
interface Ask { page: string; wizard: boolean; resolve: (cfg: any) => void; timer?: number }
const waiting: Ask[] = [];
let inFlight: Ask | null = null;
const listeners: Listener[] = [];
const TIMEOUT = 8000;

// 'audio_interface-alsa_controller' and 'audio_interface/alsa_controller' name the same page
export const pageKey = (p: string) => String(p || '').replace('-', '/');

function pump() {
  if (inFlight || !waiting.length) { return; }
  const ask = waiting.shift()!;
  inFlight = ask;
  emit(ask.wizard ? 'getWizardUiConfig' : 'getUiConfig', { page: ask.page });
  // a page that never answers must not stall the ones behind it
  ask.timer = window.setTimeout(() => { if (inFlight === ask) { inFlight = null; ask.resolve(null); pump(); } }, TIMEOUT);
}

export function askUiConfig(page: string, wizard = false): Promise<any> {
  return new Promise((resolve) => { waiting.push({ page: pageKey(page), wizard, resolve }); pump(); });
}
// every answer, with the page it was asked for (null when the player pushed on its own, e.g. after a save)
export function onUiConfig(fn: Listener): () => void { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i > -1) { listeners.splice(i, 1); } }; }

// the answer that carries the playback fields, whichever page it came from
export const ALSA_PAGE = 'audio_interface/alsa_controller';
export function isAlsa(cfg: any): boolean {
  let hit = false;
  const walk = (arr: any[]) => (arr || []).forEach(el => { if (!el) { return; } const id = String(el.id || ''); if (id === 'output_device' || id === 'resampling' || id === 'i2sid') { hit = true; } if (el.content) { walk(el.content); } });
  try { (cfg.sections || []).forEach((s: any) => walk(s.content)); walk(cfg.content); } catch { /* not a config */ }
  return hit;
}

on('pushUiConfig', (cfg: any) => {
  const head = inFlight;
  if (head) { inFlight = null; window.clearTimeout(head.timer); head.resolve(cfg); }
  listeners.forEach(l => { try { l(head ? head.page : null, cfg); } catch { /* a listener's own trouble */ } });
  pump();
});
