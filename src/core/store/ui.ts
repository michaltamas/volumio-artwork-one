/** The panels that float over the page: the queue, the zones & outputs sheet, the phone menu. */
import { create } from 'zustand';

interface UiStore {
  queueOpen: boolean;
  outputsOpen: boolean;
  menuOpen: boolean;
  railOpen: boolean;       // the rail shows its labels (remembered by this browser)
  searchFocus: boolean;
  npLeaving: boolean;     // Now Playing is sliding away: the page beneath is already shown
  underPath: string;      // the page beneath Now Playing, where its chevron goes (never the browser's history)
  toggleQueue: () => void;
  showQueue: () => void;
  hideQueue: () => void;
  toggleOutputs: () => void;
  toggleMenu: () => void;
  hideMenu: () => void;
  toggleRail: () => void;
}

const RAIL_KEY = 'aw-rail-open';
const readRail = () => { try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } };

export const useUi = create<UiStore>((set, get) => ({
  queueOpen: false,
  outputsOpen: false,
  menuOpen: false,
  railOpen: readRail(),
  searchFocus: false,
  npLeaving: false,
  underPath: '/home',
  toggleQueue: () => set({ queueOpen: !get().queueOpen, outputsOpen: false }),
  showQueue: () => set({ queueOpen: true, outputsOpen: false }),
  hideQueue: () => set({ queueOpen: false }),
  toggleOutputs: () => set({ outputsOpen: !get().outputsOpen, queueOpen: false }),
  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  hideMenu: () => set({ menuOpen: false }),
  toggleRail: () => { const open = !get().railOpen; set({ railOpen: open }); try { localStorage.setItem(RAIL_KEY, open ? '1' : '0'); } catch { /* not remembered */ } },
}));
