/**
 * The settings menu as Volumio pushes it (pages, modals, links) and the system info. Items are
 * keyed by their untranslated fields — a plugin name, a modal name, an id — never by the
 * translated title, which changes with the UI language.
 */
import { create } from 'zustand';
import { on, emit } from '../socket';

export interface MenuItem {
  id?: string;
  name?: string;
  state?: string;
  params?: { pluginName?: string; modalName?: string; url?: string; modalSize?: string; [k: string]: any };
  pageName?: string;
  [k: string]: any;
}

export interface SystemInfo { systemversion?: string; hardware?: string; name?: string; [k: string]: any }

interface MenuStore {
  items: MenuItem[];
  systemInfo: SystemInfo | null;
  hasMyVolumio: () => boolean;
  byKey: (key: string) => MenuItem | null;
}

const BY_PLUGIN: Record<string, string> = {
  'audio_interface/alsa_controller': 'playback',
  'miscellanea/my_music': 'sources',
  'miscellanea/appearance': 'appearance',
  'system_controller/network': 'network',
  'system_controller/system': 'system',
  'audio_interface/fusiondsp': 'equalizer',
};
const BY_MODAL: Record<string, string> = { 'modal-alarm-clock': 'alarm', 'modal-sleep': 'sleep', 'modal-power-off': 'shutdown' };
const BY_ID: Record<string, string> = { 'plugin-manager': 'plugins', shutdown: 'shutdown', 'my-volumio': 'myvolumio', multiroom: 'zones' };

export function itemKey(item: MenuItem | null): string | null {
  if (!item) { return null; }
  const p = item.params || {};
  const plugin = String(p.pluginName || '');
  if (plugin) { return BY_PLUGIN[plugin] || ('plugin:' + plugin); }
  const modal = String(p.modalName || '');
  if (modal) { return BY_MODAL[modal] || ('modal:' + modal); }
  const url = String(p.url || '');
  if (url) { if (url.indexOf('help.') > -1) { return 'help'; } if (url.indexOf('/shop') > -1) { return 'shop'; } return 'link'; }
  return BY_ID[item.id || ''] || item.id || null;
}

export const useMenu = create<MenuStore>((_set, get) => ({
  items: [],
  systemInfo: null,
  hasMyVolumio: () => get().items.some(i => i && i.id === 'my-volumio'),
  byKey: (key) => get().items.find(i => itemKey(i) === key) || null,
}));

on('pushMenuItems', (data: MenuItem[]) => useMenu.setState({ items: Array.isArray(data) ? data : [] }));
on('pushSystemInfo', (d: SystemInfo) => useMenu.setState({ systemInfo: d || null }));
emit('getMenuItems');
emit('getSystemInfo');
