/**
 * Pins: quick access on Home (handoff 10a/10b). Anything one keeps going back to in the
 * library, pinned from its row menu, shown as a shelf, dragged into order. The list lives on
 * the player when the companion plugin is there and in this browser otherwise.
 */
import { create } from 'zustand';

const KEY = 'aw-pins';
const MAX = 24;
const PINNABLE = ['folder', 'internal-folder', 'folder-with-favourites', 'remdisk', 'playlist', 'webradio', 'mywebradio', 'album', 'artist', 'streaming-category'];

export interface Pin { uri: string; service: string; type: string; title: string; albumart?: string; artist?: string; album?: string }

type Writer = (list: Pin[]) => void;

interface PinsStore {
  list: Pin[];
  remote: Writer | null;
  adopt: (pins: any[], writer: Writer) => void;
  save: () => void;
  canPin: (item: any) => boolean;
  isPinned: (item: any) => boolean;
  pin: (item: any) => void;
  unpin: (item: any) => void;
  move: (from: number, to: number) => void;
}

export function cleanPin(item: any): Pin | null {
  if (!item || !item.uri) { return null; }
  const out: Pin = { uri: String(item.uri).slice(0, 600), service: String(item.service || ''), type: String(item.type || ''), title: String(item.title || item.name || item.album || '').slice(0, 200) };
  if (item.albumart) { out.albumart = String(item.albumart).slice(0, 600); }
  if (item.artist) { out.artist = String(item.artist).slice(0, 200); }
  if (item.album) { out.album = String(item.album).slice(0, 200); }
  return out;
}

export function readPins(): Pin[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.map(cleanPin).filter((p): p is Pin => !!p) : []; } catch { return []; }
}

// "ALBUM · NAS", "PLAYLIST", "WEB RADIO": the kind, then where it lives when that says something
export function pinEyebrow(p: Pin): string {
  const uri = String(p.uri || ''), type = String(p.type || '');
  let kind = 'ITEM';
  if (/^(albums|artists):\/\/[^/]+\/./.test(uri) || type === 'album') { kind = 'ALBUM'; }
  else if (/^albums:\/\/?$/.test(uri)) { kind = 'ALBUMS'; }
  else if (/^artists:\/\/./.test(uri) || type === 'artist') { kind = 'ARTIST'; }
  else if (/^artists:\/\/?$/.test(uri)) { kind = 'ARTISTS'; }
  else if (/^genres:\/\//.test(uri)) { kind = 'GENRE'; }
  else if (type === 'playlist') { kind = 'PLAYLIST'; }
  else if (type === 'webradio' || type === 'mywebradio') { kind = 'WEB RADIO'; }
  else if (type === 'remdisk') { kind = 'DRIVE'; }
  else if (/folder/.test(type)) { kind = 'FOLDER'; }
  else if (type === 'streaming-category') { kind = 'SOURCE'; }
  let where = '';
  const svc = String(p.service || '').toLowerCase();
  if (svc === 'mpd' || svc === '') { const m = /^music-library\/([^/]+)/.exec(uri); if (m) { where = m[1].toUpperCase(); } }
  else if (svc !== 'webradio') { where = svc.toUpperCase(); }
  return where ? kind + ' · ' + where : kind;
}

export function pinGlyph(p: Pin): string {
  const type = String(p.type || ''), uri = String(p.uri || '');
  if (type === 'webradio' || type === 'mywebradio') { return 'radio'; }
  if (type === 'playlist') { return 'queue_music'; }
  if (/^(albums|artists):\/\/[^/]+\/./.test(uri) || type === 'album') { return 'album'; }
  if (/^artists:\/\//.test(uri) || type === 'artist') { return 'person'; }
  if (/^albums:\/\//.test(uri)) { return 'album'; }
  if (/^genres:\/\//.test(uri)) { return 'graphic_eq'; }
  if (type === 'remdisk') { return 'usb'; }
  return 'folder';
}

export const usePins = create<PinsStore>((set, get) => ({
  list: readPins(),
  remote: null,
  adopt: (pins, writer) => set({ remote: writer, list: (Array.isArray(pins) ? pins : []).map(cleanPin).filter((p): p is Pin => !!p) }),
  save: () => {
    const { list, remote } = get();
    if (remote) { remote(list.slice()); return; }
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* nothing to remember it with */ }
  },
  canPin: (item) => {
    if (!item || !item.uri) { return false; }
    if (PINNABLE.indexOf(String(item.type || '')) > -1) { return true; }
    return /^(albums|artists|genres):\/\//.test(String(item.uri));
  },
  isPinned: (item) => !!(item && item.uri && get().list.some(p => p.uri === item.uri)),
  pin: (item) => {
    const p = cleanPin(item); if (!p || get().isPinned(p)) { return; }
    const list = [...get().list, p]; if (list.length > MAX) { list.shift(); }
    set({ list }); get().save();
  },
  unpin: (item) => { const list = get().list.filter(p => p.uri !== item.uri); if (list.length !== get().list.length) { set({ list }); get().save(); } },
  move: (from, to) => {
    const list = get().list.slice();
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) { return; }
    const [p] = list.splice(from, 1); list.splice(to, 0, p);
    set({ list }); get().save();
  },
}));
