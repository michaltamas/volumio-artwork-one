/**
 * The plugins: what is installed, what the store offers, and which installed ones have a newer
 * version. The player works the last one out itself (`updateAvailable` on the store's list, against
 * the installed version — against the beta when the player is in plugin test mode), so the theme
 * only joins the two lists. Asked for once when Settings opens, and again on "Check for updates".
 */
import { create } from 'zustand';
import { on, emit } from '../socket';

export interface PluginUpdate { name: string; prettyName: string; category: string; from: string; to: string; url: string; icon?: string }

interface PluginsStore {
  installed: any[];          // as the player pushes it: a flat list of plugins (older builds: categories with plugins)
  available: any;            // the store's answer: { categories: [{ name, plugins }] }
  updates: PluginUpdate[];
  checking: boolean;
  checkedAt: number;
  refresh: () => void;       // the store's list again (the player asks the store)
  ensure: () => void;        // once per session
}

export const usePlugins = create<PluginsStore>((set, get) => ({
  installed: [], available: null, updates: [], checking: false, checkedAt: 0,
  refresh: () => { set({ checking: true }); emit('getInstalledPlugins'); emit('getAvailablePlugins'); window.setTimeout(() => { if (get().checking) { set({ checking: false }); } }, 20000); },
  ensure: () => { if (!get().checkedAt && !get().checking) { get().refresh(); } },
}));

// a newer version than the installed one: the stable when it is the newer, else the beta (test mode)
const newer = (p: any) => {
  const v = String(p.version || '');
  const cmp = (a: string, b: string) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) { return d; } } return 0; };
  try { if (p.stableVersion && cmp(String(p.stableVersion), v) > 0) { return String(p.stableVersion); } if (p.betaVersion && cmp(String(p.betaVersion), v) > 0) { return String(p.betaVersion); } } catch { /* odd version strings */ }
  return p.stableVersion ? String(p.stableVersion) : '';
};

on('pushInstalledPlugins', (d: any) => { if (Array.isArray(d)) { usePlugins.setState({ installed: d }); } });
on('pushAvailablePlugins', (d: any) => {
  const cats: any[] = (d && d.categories) || (Array.isArray(d) ? d : []);
  const updates: PluginUpdate[] = [];
  cats.forEach((c) => (c.plugins || []).forEach((p: any) => { if (p && p.installed && p.updateAvailable) { updates.push({ name: p.name, prettyName: p.prettyName || p.name, category: p.category || c.name, from: String(p.version || ''), to: newer(p), url: p.url, icon: p.icon }); } }));
  usePlugins.setState({ available: d, updates, checking: false, checkedAt: Date.now() });
});
