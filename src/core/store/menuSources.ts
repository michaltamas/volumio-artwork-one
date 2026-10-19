/**
 * The library's sources in the menu (the rail, the phone's menu sheet): Playlists and Favourites
 * unless switched off, any other source — Randomizer, Tidal, Web Radio, a folder of the library —
 * once switched on (Appearance → Menu), in the order dragged there. The choices and the order live
 * on the player when the plugin keeps them (`menu`, `menuOrder` in its settings) and in this browser
 * always, so a plugin that does not know the keys yet (an update waiting for a restart) still leaves
 * the switch where it was put.
 */
import { create } from 'zustand';
import type { BrowseItem } from './browse';

const KEY = 'aw-menu';
const ORDER_KEY = 'aw-menu-order';
// shown until someone switches them off: the rail's own entries before there was a choice
export const MENU_DEFAULT = ['playlists', 'favourites'];

type Writer = (patch: { menu?: Record<string, boolean>; menuOrder?: string[] }) => void;

interface MenuSourcesStore {
  choices: Record<string, boolean>;
  order: string[];
  remote: Writer | null;
  adopt: (menu: any, order: any, writer: Writer | null) => void;
  setOrder: (uris: string[]) => void;
  shown: (uri: string) => boolean;
  set: (uri: string, on: boolean) => void;
}

function clean(m: any): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!m || typeof m !== 'object' || Array.isArray(m)) { return out; }
  Object.keys(m).forEach((uri) => { if (uri && uri.length <= 200 && typeof m[uri] === 'boolean') { out[uri] = m[uri]; } });
  return out;
}
function cleanOrder(l: any): string[] { return Array.isArray(l) ? l.filter((u, i) => typeof u === 'string' && u && u.length <= 200 && l.indexOf(u) === i) : []; }
function readOrder(): string[] { try { return cleanOrder(JSON.parse(localStorage.getItem(ORDER_KEY) || '[]')); } catch { return []; } }
function writeOrder(o: string[]) { try { localStorage.setItem(ORDER_KEY, JSON.stringify(o)); } catch { /* nothing to remember it with */ } }
function read(): Record<string, boolean> { try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return {}; } }
function write(c: Record<string, boolean>) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* nothing to remember it with */ } }

export const useMenuSources = create<MenuSourcesStore>((set, get) => ({
  choices: read(),
  order: readOrder(),
  remote: null,
  // the player's choices and order win over this browser's, and are remembered here too
  adopt: (menu, order, writer) => {
    const c = menu ? { ...get().choices, ...clean(menu) } : get().choices; write(c);
    const o = cleanOrder(order).length ? cleanOrder(order) : get().order; writeOrder(o);
    set({ choices: c, order: o, remote: writer });
  },
  setOrder: (uris) => { const o = cleanOrder(uris); writeOrder(o); set({ order: o }); const w = get().remote; if (w) { w({ menuOrder: o }); } },
  shown: (uri) => { const c = get().choices[uri]; return c === undefined ? MENU_DEFAULT.indexOf(uri) > -1 : c; },
  set: (uri, on) => { const c = { ...get().choices, [uri]: on }; write(c); set({ choices: c }); const w = get().remote; if (w) { w({ menu: { [uri]: on } }); } },
}));

/** every source in the menu's order: the dragged order first, then Playlists and Favourites, then the rest in Volumio's order */
export function orderedSources(sources: BrowseItem[], order: string[]): BrowseItem[] {
  const rank = (s: BrowseItem) => { const i = order.indexOf(s.uri); if (i > -1) { return i; } const d = MENU_DEFAULT.indexOf(s.uri); return order.length + (d > -1 ? d : MENU_DEFAULT.length + sources.indexOf(s)); };
  return sources.slice().sort((a, b) => rank(a) - rank(b));
}

/** the sources the menu shows, in the menu's order */
export function menuSources(sources: BrowseItem[], shown: (uri: string) => boolean, order: string[]): BrowseItem[] {
  return orderedSources(sources, order).filter(s => shown(s.uri));
}

// the library's own sources by a glyph; a plugin's by its logo (SourceGlyph), a cloud without one
const GLYPHS: Record<string, string> = {
  playlists: 'playlist_play', favourites: 'favorite', 'music-library': 'folder_open', 'artists://': 'person', 'albums://': 'album',
  'genres://': 'category', radio: 'radio', upnp: 'dns', Last_100: 'history',
};
export function sourceGlyph(uri: string): string | null { return GLYPHS[uri] || null; }
