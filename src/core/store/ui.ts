/** The panels that float over the page: the queue, the zones & outputs sheet, the phone menu. */
import { create } from 'zustand';

interface UiStore {
  queueOpen: boolean;
  queuePinned: boolean;    // the queue sits beside Now Playing instead of over it (remembered by this browser)
  dockRoom: boolean;       // the window is wide enough for that (DOCK_QUERY)
  dockHidden: boolean;     // pinned, but put away with the queue button (stays pinned for the next time)
  outputsOpen: boolean;
  menuOpen: boolean;
  railOpen: boolean;       // the rail shows its labels (remembered by this browser)
  searchFocus: boolean;
  npLeaving: boolean;     // Now Playing is sliding away: the page beneath is already shown
  underPath: string;      // the page beneath Now Playing, where its chevron goes (never the browser's history)
  toggleQueue: () => void;
  showQueue: () => void;
  hideQueue: () => void;
  toggleQueuePin: () => void;
  toggleDocked: () => void;
  toggleOutputs: () => void;
  toggleMenu: () => void;
  hideMenu: () => void;
  toggleRail: () => void;
}

const RAIL_KEY = 'aw-rail-open';
const readRail = () => { try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } };
const PIN_KEY = 'aw-queue-pinned';
const readPin = () => { try { return localStorage.getItem(PIN_KEY) === '1'; } catch { return false; } };
// beside the 440px queue Now Playing still needs its wide layout: the same 1100px line its view switch uses
export const DOCK_QUERY = '(min-width: 1101px)';
const readDockRoom = () => { try { return window.matchMedia(DOCK_QUERY).matches; } catch { return false; } };

export const useUi = create<UiStore>((set, get) => ({
  queueOpen: false,
  queuePinned: readPin(),
  dockRoom: readDockRoom(),
  dockHidden: false,
  outputsOpen: false,
  menuOpen: false,
  railOpen: readRail(),
  searchFocus: false,
  npLeaving: false,
  underPath: '/home',
  toggleQueue: () => set({ queueOpen: !get().queueOpen, outputsOpen: false }),
  showQueue: () => set({ queueOpen: true, outputsOpen: false }),
  hideQueue: () => set({ queueOpen: false }),
  // pinned, the queue is part of Now Playing and needs no open flag (left open it would float over
  // the next page); unpinned, it stays in sight as the floating sheet
  toggleQueuePin: () => { const pinned = !get().queuePinned; set({ queuePinned: pinned, queueOpen: !pinned, dockHidden: false, outputsOpen: false }); try { localStorage.setItem(PIN_KEY, pinned ? '1' : '0'); } catch { /* not remembered */ } },
  toggleDocked: () => set({ dockHidden: !get().dockHidden, queueOpen: false, outputsOpen: false }),
  toggleOutputs: () => set({ outputsOpen: !get().outputsOpen, queueOpen: false }),
  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  hideMenu: () => set({ menuOpen: false }),
  toggleRail: () => { const open = !get().railOpen; set({ railOpen: open }); try { localStorage.setItem(RAIL_KEY, open ? '1' : '0'); } catch { /* not remembered */ } },
}));

try { const mq = window.matchMedia(DOCK_QUERY); mq.addEventListener('change', () => useUi.setState({ dockRoom: mq.matches })); } catch { /* no media queries: stays as read */ }

/** The queue is docked beside the page: pinned, on Now Playing, in a window wide enough for both. */
export const canDockQueue = (s: UiStore, onPlayback: boolean) => s.queuePinned && s.dockRoom && onPlayback;
/** …and not put away with the queue button. */
export const isQueueDocked = (s: UiStore, onPlayback: boolean) => canDockQueue(s, onPlayback) && !s.dockHidden;
