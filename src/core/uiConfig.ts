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

// the endpoints a config's buttons call (onSave of the sections, onClick of the elements), each with how often
function endpointsOf(cfg: any): Record<string, number> {
  const count: Record<string, number> = {};
  const add = (a: any) => { const e = a && typeof a.endpoint === 'string' ? a.endpoint : ''; if (e) { count[e] = (count[e] || 0) + 1; } };
  try {
    (cfg.sections || []).forEach((sec: any) => { if (!sec) { return; } add(sec.onSave); (sec.content || []).forEach((el: any) => { if (el) { add(el.onClick); add(el.onSave); } }); });
  } catch { return {}; }
  return count;
}
// whose page a config is: the endpoint most of its buttons name; '' when it names none
export function endpointOf(cfg: any): string {
  const count = endpointsOf(cfg);
  let best = '', n = 0;
  Object.keys(count).forEach(k => { if (count[k] > n) { best = k; n = count[k]; } });
  return best;
}

on('pushUiConfig', (cfg: any) => {
  // A plugin may push its page to every screen on its own after a change (FusionDsp does, after each
  // switch): that is no answer to the ask in flight, and taking it for one shifted every answer after
  // it by one — the next page asked for got the page before it (FusionDsp opened as Appearance).
  // Such a push names its own plugin only. An answer is the asked page's when it names that page among its
  // endpoints, names none, or names several plugins (Sources gathers Spotify's, MPD's, the album art's
  // sections — its own endpoint is not the one most of them call).
  const eps = Object.keys(endpointsOf(cfg));
  const ep = endpointOf(cfg);
  const head = inFlight;
  const answers = !!head && (head.wizard || !eps.length || eps.indexOf(head.page) > -1 || eps.length > 1);
  if (answers && head) { inFlight = null; window.clearTimeout(head.timer); head.resolve(cfg); }
  const page = answers && head ? head.page : (ep || null);   // a page pushed on its own reaches that page only (null: nobody can tell whose)
  listeners.forEach(l => { try { l(page, cfg); } catch { /* a listener's own trouble */ } });
  if (answers) { pump(); }
});
