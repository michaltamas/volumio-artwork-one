/** Where a settings menu item leads: the same rules as Volumio's settings page, on the router. */
import type { NavigateFunction } from 'react-router-dom';
import { itemKey, type MenuItem } from '../../core/store/menu';
import { useModal } from '../../core/store/modal';

export const ICONS: Record<string, string> = { playback: 'graphic_eq', sources: 'library_music', appearance: 'palette', network: 'wifi', system: 'memory', plugins: 'extension', alarm: 'alarm', sleep: 'bedtime', shutdown: 'power_settings_new', help: 'help', shop: 'storefront', zones: 'speaker', equalizer: 'tune', myvolumio: 'person', link: 'open_in_new' };
export const GROUPS = [
  { label: 'PLAYBACK', keys: ['playback', 'equalizer', 'appearance', 'zones'] },
  { label: 'LIBRARY & SOURCES', keys: ['sources', 'plugins'] },
  { label: 'SYSTEM', keys: ['network', 'system', 'alarm', 'sleep', 'shutdown', 'myvolumio', 'help', 'shop'] },
];
const MODALS: Record<string, string> = { 'modal-sleep': 'sleep', 'modal-alarm-clock': 'alarm-clock', 'modal-power-off': 'power-off' };

export function iconOf(item: MenuItem): string { const k = itemKey(item) || ''; if (ICONS[k]) { return ICONS[k]; } return k.indexOf('plugin:') === 0 ? 'extension' : 'settings'; }

export function stateToPath(state: string, params?: Record<string, any>): string {
  const p = params || {};
  if (state === 'volumio.plugin' && p.pluginName) { return '/plugin/' + String(p.pluginName).replace('/', '-'); }
  if (state === 'volumio.settings') { return '/settings'; }
  if (state === 'volumio.plugin-manager') { return '/plugin-manager'; }
  if (state === 'volumio.multi-room' || state === 'volumio.multiroom') { return '/multi-room'; }
  if (state.indexOf('myvolumio.') === 0) { return '/myvolumio/' + state.slice('myvolumio.'.length); }
  return '/' + state.replace(/^volumio\./, '');
}

/** the frame's router writes a string parameter with `/` as `~2F` and `~` as `~~`, the rest as typed */
export const routeParam = (v: string) => v.replace(/[~/]/g, m => (m === '~' ? '~~' : '~2F'));

export function itemClick(item: MenuItem | null, nav: NavigateFunction): void {
  if (!item) { return; }
  const p: any = item.params || {};
  if (item.id === 'modal' || item.id === 'shutdown') { const name = MODALS[String(p.modalName)] || String(p.modalName); useModal.getState().open(name as any, item); }
  else if (item.id === 'link') { window.open(p.url); }
  else if (item.id === 'static-page') { nav('/static-page/' + encodeURIComponent(String((item as any).pageName || ''))); }
  else if (item.id === 'iframe-page') { nav('/iframe-page/' + routeParam(String(p.url || ''))); }
  else if (item.state) { nav(stateToPath(item.state, item.params)); }
}
