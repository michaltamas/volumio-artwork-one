/**
 * The settings entry (handoff 15E). Where the settings menu stands beside the page, there is no
 * empty landing: Settings opens straight on the section visited last, the first time on the menu's
 * first one. On the phone the menu itself is the landing (SettingsNav draws it), and this is empty.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../core/store/settings';
import { itemClick } from '../components/settings/nav';

// the phone's settings: the menu is the landing (the same query the shell's stylesheet uses)
const MENU_LANDING = '(max-width: 700px) and (orientation: portrait)';
export const LAST_KEY = 'aw-settings-last';

export default function Settings() {
  const nav = useNavigate();
  const first = useSettings(s => s.menu().find(i => i && i.state) || null);
  useEffect(() => {
    let landing = false;
    try { landing = window.matchMedia(MENU_LANDING).matches; } catch { /* no media queries: wide */ }
    if (landing) { return; }
    let last = '';
    try { last = localStorage.getItem(LAST_KEY) || ''; } catch { /* storage blocked */ }
    if (/^\/(plugin\/|plugin-manager$)/.test(last)) { nav(last, { replace: true }); return; }
    if (first) { itemClick(first, (to: any, o?: any) => nav(to, { ...(o || {}), replace: true })); }
  }, [first]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
