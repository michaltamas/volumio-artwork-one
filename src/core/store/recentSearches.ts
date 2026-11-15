/** The last searches typed in this browser (`aw-recent-searches`): shown under an empty search field, one tap runs them again. */
import { create } from 'zustand';

const KEY = 'aw-recent-searches';
const KEEP = 8;
const TYPING_MS = 20000;   // answers this close together, one starting with the other, are one search being typed
let lastAt = 0;

interface RecentStore { list: string[]; add: (q: string) => void; remove: (q: string) => void; clear: () => void }

function read(): string[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).slice(0, KEEP) : []; } catch { return []; } }
function write(list: string[]) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ } }

export const useRecentSearches = create<RecentStore>((set, get) => ({
  list: read(),
  add: (q) => {
    const v = q.trim(); if (v.length < 2) { return; }
    const low = v.toLowerCase();
    const same = (a: string) => a.toLowerCase() === low;
    // typed on: "be", "beat", "beatles" answered one after another are one search, the last of them kept
    const prev = get().list[0], now = Date.now();
    const typedOn = !!prev && now - lastAt < TYPING_MS && (low.indexOf(prev.toLowerCase()) === 0 || prev.toLowerCase().indexOf(low) === 0);
    lastAt = now;
    const list = [v, ...get().list.slice(typedOn ? 1 : 0).filter(x => !same(x))].slice(0, KEEP);
    write(list); set({ list });
  },
  remove: (q) => { const list = get().list.filter(x => x !== q); write(list); set({ list }); },
  clear: () => { write([]); set({ list: [] }); },
}));
