/**
 * The settings menu (handoff 15E). Wide: the shell's left column — its title, the search, the
 * sections, and Help and the shop under a hairline at the foot. While a search is open the menu
 * shows where the hits are: a count beside each section with matches, the others dimmed, and a
 * dashed edge on the section you were in. Phone: the landing screen — the title, the search, and
 * the sections in one card, a value on a row only where it saves a tap.
 */
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import PageHead from '../PageHead';
import { SearchField, SearchResults, useSearchResults } from './SettingsSearch';
import { usePlugins } from '../../core/store/plugins';
import { useMenu, itemKey, type MenuItem } from '../../core/store/menu';
import { useSettings } from '../../core/store/settings';
import { iconOf, itemClick } from './nav';

// the entries that lead out of the settings (help, the shop): at the menu's foot
const FOOT = ['help', 'shop'];

export default function SettingsNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const items = useMenu(s => s.items);
  const systemInfo = useMenu(s => s.systemInfo);
  const network = useSettings(s => s.network);
  const searching = useSettings(s => !!s.searchQuery.trim());
  const isActive = useSettings(s => s.isActive);
  const inMenu = useSettings(s => s.inMenu);
  useSettings(s => s.route);   // redrawn when the page changes: isActive itself never does
  const menu = items.filter(i => i && i.id !== 'my-volumio');
  const main = menu.filter(i => FOOT.indexOf(itemKey(i) || '') < 0);
  const foot = menu.filter(i => FOOT.indexOf(itemKey(i) || '') > -1);
  const isLanding = loc.pathname === '/settings';
  // the plugin store is asked once per session: the Plugins entry then says how many updates wait
  const updates = usePlugins(s => s.updates.length);
  useEffect(() => { usePlugins.getState().ensure(); }, []);
  // a search ends when the settings are left
  useEffect(() => () => { useSettings.getState().setSearch(''); }, []);
  // how many hits each entry holds: a plugin page without its own entry counts under Plugins
  const results = useSearchResults();
  const counts = useMemo(() => {
    const c = new Map<MenuItem, number>();
    const plugins = menu.find(i => itemKey(i) === 'plugins');
    results.forEach((r) => {
      const pn = r.item.params && r.item.params.pluginName;
      const owner = menu.indexOf(r.item) > -1 ? r.item : (pn && !inMenu(String(pn)) ? plugins : null);
      if (owner) { c.set(owner, (c.get(owner) || 0) + 1); }
    });
    return c;
  }, [results, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = (item: MenuItem): { text: string; mono?: boolean; warn?: boolean } | null => {
    const k = itemKey(item);
    const net = Array.isArray(network) ? network.find((n: any) => n && n.ssid) : null;
    if (k === 'network' && net) { return { text: String(net.ssid) }; }
    if (k === 'system' && systemInfo && systemInfo.systemversion) { return { text: String(systemInfo.systemversion), mono: true }; }
    if (k === 'plugins' && updates) { return { text: String(updates), mono: true, warn: true }; }
    return null;
  };
  const entry = (item: MenuItem, i: number, small?: boolean) => {
    const n = counts.get(item) || 0;
    const here = isActive(item);
    const cls = 'aw-snav__item' + (small ? ' aw-snav__item--foot' : '') + (here ? (searching ? ' was-here' : ' active') : '') + (searching && !n ? ' is-dim' : '');
    return (
      <a key={i} className={cls} onClick={() => itemClick(item, nav)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { itemClick(item, nav); } }}>
        <Icon name={iconOf(item)} /><span className="aw-snav__label">{item.name}</span>
        {searching && n ? <span className="aw-snav__count mono" aria-label={n + ' results'}>{n}</span> : null}
        {!searching && updates && itemKey(item) === 'plugins' ? <span className="aw-snav__badge mono" aria-label={updates + ' plugin updates'}>{updates}</span> : null}
        {itemKey(item) === 'shop' ? <Icon name="open_in_new" className="aw-snav__out" /> : null}
      </a>
    );
  };
  return (
    <>
      <nav className="aw-snav" aria-label="Settings">
        <div className="aw-snav__title">Settings</div>
        <SearchField className="aw-sfield--nav" />
        {main.map((item, i) => entry(item, i))}
        {foot.length ? <div className="aw-snav__foot">{foot.map((item, i) => entry(item, i, true))}</div> : null}
      </nav>
      {isLanding ? (
        <div className="aw-mnav">
          <PageHead variant="settings" nav={<nav className="aw-crumbs" aria-label="Breadcrumb"><span className="aw-crumbs__cur">Settings</span></nav>} />
          <div className="aw-mnav__title">Settings</div>
          <SearchField className="aw-sfield--landing" />
          {searching ? <SearchResults /> : (
            <>
              <div className="aw-mnav__card">
                {main.map((item, i) => {
                  const v = value(item);
                  return (
                    <a key={i} className="aw-mnav__row" onClick={() => itemClick(item, nav)}>
                      <Icon name={iconOf(item)} /><span className="aw-mnav__label">{item.name}</span>
                      {v ? <span className={'aw-mnav__value' + (v.mono ? ' mono' : '') + (v.warn ? ' aw-mnav__value--warn' : '')}>{v.warn ? <i aria-hidden="true" /> : null}{v.text}</span> : null}
                      <Icon name="chevron_right" className="aw-mnav__chev" />
                    </a>
                  );
                })}
              </div>
              {foot.length ? (
                <div className="aw-mnav__foot">
                  {foot.map((item, i) => <a key={i} className="aw-mnav__link" onClick={() => itemClick(item, nav)}>{item.name}{itemKey(item) === 'shop' ? <Icon name="open_in_new" /> : null}</a>)}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
