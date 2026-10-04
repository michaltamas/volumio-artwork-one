/**
 * The settings shell's shared state: the settings menu, system info, network interfaces,
 * library stats, the ALSA config read passively from a pushed UI config (never asked for:
 * a second push would re-render an open form), and the settings search index (handoff 11a).
 */
import { create } from 'zustand';
import { on, emit } from '../socket';
import { askUiConfig, onUiConfig } from '../uiConfig';
import { rest } from '../api';
import { usePlayer } from './player';
import { useMenu, itemKey, type MenuItem } from './menu';

export interface Section { id: string; label: string }
export interface Alsa { output: string; mixerType: string; mixer: string; resampling: boolean | null; resamplingTarget: string }
export interface SearchResult { kind: 'page' | 'section'; title: string; sub: string; eyebrow: string; item: MenuItem; section?: string; key: string }

interface SettingsStore {
  network: any[] | null;
  stats: any;
  alsa: Alsa | null;
  searchIndex: Record<string, Section[]>;
  extraPages: MenuItem[] | null;
  asking: string | null;
  searchQuery: string;
  route: { name: string; pluginName: string };   // the open page, as the router reports it
  menu: () => MenuItem[];
  allPages: () => MenuItem[];
  pluginPages: () => MenuItem[];
  sectionsOf: (pn: string) => Section[];
  searchSettings: (q: string) => SearchResult[];
  askMissing: () => void;
  isActive: (item: MenuItem) => boolean;
  activeItem: () => MenuItem | null;
  pageKey: () => string | null;
  hasSide: () => boolean;
}

// the sections this theme adds to Volumio's Appearance page itself
const THEME_SECTIONS: Record<string, Section[]> = { 'miscellanea/appearance': [{ id: 'aw-theme', label: 'Theme' }, { id: 'aw-screen', label: 'Keep the screen on, text size, hide volume' }, { id: 'aw-ambient', label: 'Ambient display' }] };
const norm = (v: any) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const useSettings = create<SettingsStore>((_set, get) => ({
  network: null, stats: null, alsa: null, searchIndex: {}, extraPages: null, asking: null, searchQuery: '', route: { name: '', pluginName: '' },
  menu: () => useMenu.getState().items.filter(i => i && i.id !== 'my-volumio'),
  allPages: () => get().menu().concat(get().extraPages || []),
  pluginPages: () => get().allPages().filter(i => i && i.state === 'volumio.plugin' && i.params && i.params.pluginName),
  sectionsOf: (pn) => (get().searchIndex[pn] || []).concat(THEME_SECTIONS[pn] || []),
  searchSettings: (q) => {
    const needle = norm(q).trim();
    if (!needle) { return []; }
    const out: SearchResult[] = [];
    get().allPages().forEach(item => {
      if (!item) { return; }
      const title = String(item.name || '');
      const pn = item.params && item.params.pluginName;
      const key = pn || itemKey(item) || title;
      if (norm(title).indexOf(needle) > -1) { out.push({ kind: 'page', title, sub: (item as any).installed ? (item as any).group : '', eyebrow: '', item, key }); }
      if (!pn) { return; }
      get().sectionsOf(pn).forEach(sec => {
        if (norm(sec.label).indexOf(needle) > -1) { out.push({ kind: 'section', title: sec.label, sub: (item as any).installed ? (item as any).group + ' · ' + title : title, eyebrow: (item as any).installed ? title : '', item, section: sec.id, key: pn + '#' + sec.id }); }
      });
    });
    return out;
  },
  askMissing: () => { if (get().route.name !== 'volumio.settings' || get().asking) { return; } askNext(); },
  isActive: (item) => {
    if (!item || !item.state) { return false; }
    const r = get().route;
    if (r.name !== item.state) { return false; }
    if (item.state === 'volumio.plugin' && item.params && item.params.pluginName) { return String(item.params.pluginName).replace('/', '-') === r.pluginName; }
    return true;
  },
  activeItem: () => get().menu().find(i => get().isActive(i)) || null,
  pageKey: () => { const k = itemKey(get().activeItem()); return k && ['playback', 'system', 'network', 'sources'].indexOf(k) > -1 ? k : null; },
  hasSide: () => !!get().pageKey(),
}));

// on the landing, read the pages not yet in the index, one at a time
function askNext() {
  const st = useSettings.getState();
  if (st.route.name !== 'volumio.settings') { useSettings.setState({ asking: null }); return; }
  if (!st.extraPages) {
    useSettings.setState({ asking: '*installed' });
    emit('getInstalledPlugins');
    window.setTimeout(() => { if (useSettings.getState().asking === '*installed') { useSettings.setState({ extraPages: [], asking: null }); askNext(); } }, 2500);
    return;
  }
  const next = st.pluginPages().find(i => !st.searchIndex[i.params!.pluginName!]);
  if (!next) { useSettings.setState({ asking: null }); return; }
  const pn = next.params!.pluginName!;
  useSettings.setState({ asking: pn });
  askUiConfig(pn).then(cfg => {
    if (useSettings.getState().asking !== pn) { return; }
    const secs = cfg && Array.isArray(cfg.sections) ? cfg.sections.filter((s: any) => s && !s.hidden && s.id && s.label).map((s: any) => ({ id: String(s.id), label: String(s.label) })) : [];
    useSettings.setState({ searchIndex: { ...useSettings.getState().searchIndex, [pn]: secs }, asking: null });
    askNext();
  });
}

// pick the ALSA values out of a pushed UI config — only when it is the ALSA page
function readAlsa(cfg: any) {
  const found: Record<string, any> = {};
  const walk = (arr: any[]) => (arr || []).forEach(el => { if (!el) { return; } const id = String(el.id || ''); const v = el.value; const label = v && typeof v === 'object' ? (v.label || v.value) : v; if (id) { found[id] = label; } if (el.content) { walk(el.content); } });
  try { (cfg.sections || []).forEach((s: any) => walk(s.content)); walk(cfg.content); } catch { return; }
  if (found.output_device === undefined) { return; }
  const res = found.resampling;
  useSettings.setState({ alsa: { output: found.output_device ? String(found.output_device) : '', mixerType: found.mixer_type ? String(found.mixer_type) : '', mixer: found.mixer ? String(found.mixer) : '',
    resampling: (res === true || res === 'true') ? true : ((res === false || res === 'false') ? false : null), resamplingTarget: [found.resampling_target_bitdepth, found.resampling_target_samplerate].filter(Boolean).join(' / ') } });
}
// a page's answer (or the player's own push for the open page) fills the index
function indexUiConfig(page: string | null, cfg: any) {
  if (!cfg || !Array.isArray(cfg.sections)) { return; }
  const st = useSettings.getState();
  const key = page ? page.replace('-', '/') : (st.route.name === 'volumio.plugin' && st.route.pluginName ? st.route.pluginName.replace('-', '/') : null);
  if (!key) { return; }
  const secs = cfg.sections.filter((s: any) => s && !s.hidden && s.id && s.label).map((s: any) => ({ id: String(s.id), label: String(s.label) }));
  useSettings.setState({ searchIndex: { ...st.searchIndex, [key]: secs } });
}

on('pushInfoNetwork', (d: any) => useSettings.setState({ network: Array.isArray(d) ? d : (d ? [d] : null) }));
onUiConfig((page, cfg) => { readAlsa(cfg); indexUiConfig(page, cfg); });
on('pushInstalledPlugins', (list: any) => {
  const parent = useSettings.getState().menu().find(i => i && i.state === 'volumio.plugin-manager');
  const extra = (Array.isArray(list) ? list : []).filter(pl => pl && pl.name && pl.category && (pl.enabled === true || pl.enabled === 'true'))
    .map(pl => ({ name: String(pl.prettyName || pl.name), state: 'volumio.plugin', params: { pluginName: pl.category + '/' + pl.name }, group: parent ? String(parent.name) : 'Plugins', installed: true } as any));
  useSettings.setState({ extraPages: extra });
  if (useSettings.getState().asking === '*installed') { useSettings.setState({ asking: null }); askNext(); }
});
emit('getInfoNetwork');
const loadStats = () => rest<any>('collectionstats').then(s => { if (s) { useSettings.setState({ stats: s }); } });
loadStats();
// while Volumio indexes the library the counts grow: asked again every 4 s, and once more when it is done
let statsTimer = 0;
usePlayer.subscribe((p, prev) => {
  const now = !!p.state.updatedb, was = !!prev.state.updatedb;
  if (now === was) { return; }
  window.clearInterval(statsTimer);
  if (now) { statsTimer = window.setInterval(loadStats, 4000); }
  loadStats();
});
