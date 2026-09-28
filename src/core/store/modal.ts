/** The sheet that is open (power, sleep, alarm, playlist, track actions…) and what it was opened with. */
import { create } from 'zustand';
import { on } from '../socket';

export type ModalName = 'power-off' | 'sleep' | 'alarm-clock' | 'playlist' | 'track-actions' | 'confirm' | 'web-radio' | 'credits' | 'gotit' | 'password' | 'installer' | 'updater' | 'nas-password' | 'myv-terms' | 'myv-paying' | 'generic' | null;

interface ModalStore {
  name: ModalName;
  data: any;
  open: (name: Exclude<ModalName, null>, data?: any) => void;
  confirm: (data: { title?: string; message?: string; danger?: boolean }) => Promise<boolean>;
  close: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  name: null,
  data: null,
  open: (name, data) => set({ name, data: data || null }),
  // a confirm: the promise settles with the choice
  confirm: (data) => new Promise<boolean>((resolve) => set({ name: 'confirm', data: { ...(data || {}), resolve } })),
  close: () => set({ name: null, data: null }),
}));

// the backend's generic confirm/info dialog (plugin details, uninstall confirm, drive/share
// prompts…): {title, message, size?, buttons: [{name, class, emit?, payload?}]}
on('openModal', (d: any) => useModal.getState().open('generic', d));
