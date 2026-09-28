/**
 * A toast with a way back (handoff 7b): "Playing next · {title}", "Added to the end · {title}",
 * 3.2 s at the bottom centre above the mini player, with Undo. One at a time. The player answers
 * the same actions with a toast of its own; `swallow` lets the ordinary toast stack drop that echo.
 */
import { create } from 'zustand';

const SHOW_MS = 3200;

export interface UndoToast { icon: string; eyebrow: string; title: string; undo: (() => void) | null; key: number }

interface UndoStore {
  current: UndoToast | null;
  swallowUntil: number;
  show: (o: { icon?: string; eyebrow?: string; title?: string; undo?: () => void; swallow?: boolean }) => void;
  undo: () => void;
  hide: () => void;
  swallowNext: () => void;
  swallows: () => boolean;
}

let timer: number | null = null;

export const useUndo = create<UndoStore>((set, get) => ({
  current: null,
  swallowUntil: 0,
  show: (o) => {
    if (timer) { window.clearTimeout(timer); }
    set({ current: { icon: o.icon || 'info', eyebrow: o.eyebrow || '', title: o.title || '', undo: o.undo || null, key: Date.now() }, swallowUntil: o.swallow ? Date.now() + 2500 : get().swallowUntil });
    timer = window.setTimeout(() => { timer = null; set({ current: null }); }, SHOW_MS);
  },
  undo: () => { const c = get().current; get().hide(); if (c && c.undo) { try { c.undo(); } catch { /* the queue moved on */ } } },
  hide: () => { if (timer) { window.clearTimeout(timer); timer = null; } set({ current: null }); },
  swallowNext: () => set({ swallowUntil: Date.now() + 2500 }),
  swallows: () => { const u = get().swallowUntil; if (!u || Date.now() > u) { return false; } set({ swallowUntil: 0 }); return true; },
}));
