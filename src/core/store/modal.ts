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
// prompts…): {title, message, size?, buttons: [{name, class, emit?, payload?, url?, state?}]}
// With `progress: true` it is Volumio's progress dialog instead (install to disk, Storage Manager,
// Soloist): a bar the player moves with `modalProgress`, and its buttons only with `modalDone`.
on('openModal', (d: any) => useModal.getState().open('generic', d && d.progress ? { ...d, status: 'modalProgress' } : d));
const progressing = () => { const m = useModal.getState(); return m.name === 'generic' && m.data && m.data.progress; };
// as Volumio's own interfaces: these move a progress dialog only, never a plain one (Spotify sends one beside its own)
on('modalProgress', (d: any) => { if (progressing()) { useModal.setState({ data: { ...useModal.getState().data, ...(d || {}), progress: true, status: 'modalProgress' } }); } });
on('modalDone', (d: any) => { if (progressing()) { useModal.setState({ data: { ...useModal.getState().data, ...(d || {}), progress: true, status: 'modalDone' } }); } });
// a plugin closing its dialogs (Spotify, between the steps of its sign-in): only the player's own, never a sheet the listener opened
on('closeAllModals', () => { if (useModal.getState().name === 'generic') { useModal.getState().close(); } });
