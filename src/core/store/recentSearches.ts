/** The last searches typed in this browser (`aw-recent-searches`): shown under an empty search field, one tap runs them again. */
import { create } from 'zustand';

const KEY = 'aw-recent-searches';
const KEEP = 8;

interface RecentStore { list: string[]; add: (q: string) => void; remove: (q: string) => void; clear: () => void }

function read(): string[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).slice(0, KEEP) : []; } catch { return []; } }
function write(list: string[]) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ } }

export const useRecentSearches = create<RecentStore>((set, get) => ({
  list: read(),
  add: (q) => {
    const v = q.trim(); if (v.length < 2) { return; }
    const same = (a: string) => a.toLowerCase() === v.toLowerCase();
    const list = [v, ...get().list.filter(x => !same(x))].slice(0, KEEP);
    write(list); set({ list });
  },
  remove: (q) => { const list = get().list.filter(x => x !== q); write(list); set({ list }); },
  clear: () => { write([]); set({ list: [] }); },
}));
