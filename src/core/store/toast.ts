/**
 * The player's messages (`pushToastMessage`): one at a time, five seconds with a progress bar,
 * the sticky error until closed. The theme's undo toast takes the echo of its own actions.
 */
import { create } from 'zustand';
import { on } from '../socket';
import { useUndo } from './undo';

export interface Toast { key: number; type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string; sticky: boolean; timeout: number; born: number }

interface ToastStore {
  toasts: Toast[];
  show: (type: string, message: string, title?: string) => void;
  close: (key: number) => void;
}

const TIMEOUT = 5000;
let quietUntil = 0;

/**
 * Browser playback reroutes the audio chain, and the player restarts MPD with a "success" toast
 * each time — noise for the listener. For `ms` from now no success toast shows, and one already
 * on screen from the last few seconds goes. Matched by type, never by (translated) text; errors and
 * infos — the plugin's own messages among them — always show.
 */
export function quietSuccess(ms: number): void {
  quietUntil = Math.max(quietUntil, Date.now() + ms);
  const now = Date.now();
  useToasts.setState({ toasts: useToasts.getState().toasts.filter(t => !(t.type === 'success' && now - t.born < 10000)) });
}

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (type, message, title) => {
    if (useUndo.getState().swallows()) { return; }
    const sticky = type === 'stickyerror';
    const kind = (sticky ? 'error' : type) as Toast['type'];
    if (['success', 'info', 'warning', 'error'].indexOf(kind) === -1) { return; }
    if (kind === 'success' && Date.now() < quietUntil) { return; }
    const t: Toast = { key: Date.now() + Math.random(), type: kind, title: title || '', message: message || '', sticky, timeout: TIMEOUT, born: Date.now() };
    // maxOpened 1, autoDismiss: the newest replaces the one on screen
    set({ toasts: [t] });
    if (!sticky) { window.setTimeout(() => get().close(t.key), TIMEOUT); }
  },
  close: (key) => set({ toasts: get().toasts.filter(t => t.key !== key) }),
}));

on('pushToastMessage', (d: any) => { if (d) { useToasts.getState().show(d.type, d.message, d.title); } });
