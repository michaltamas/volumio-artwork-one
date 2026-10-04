/** The settings shell's left nav (desktop) and the grouped list on the phone landing. */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import PageHead from '../PageHead';
import SettingsSearch from './SettingsSearch';
import { usePlugins } from '../../core/store/plugins';
import { useMenu, itemKey, type MenuItem } from '../../core/store/menu';
import { useSettings } from '../../core/store/settings';
import { GROUPS, iconOf, itemClick } from './nav';

export default function SettingsNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const items = useMenu(s => s.items);
  const systemInfo = useMenu(s => s.systemInfo);
  const alsa = useSettings(s => s.alsa);
  const network = useSettings(s => s.network);
  const searchQuery = useSettings(s => s.searchQuery);
  const isActive = useSettings(s => s.isActive);
  const menu = items.filter(i => i && i.id !== 'my-volumio');
  const isLanding = loc.pathname === '/settings';
  // the plugin store is asked once per session: the Plugins entry then says how many updates wait
  const updates = usePlugins(s => s.updates.length);
  useEffect(() => { usePlugins.getState().ensure(); }, []);
  const used: Record<string, boolean> = {};
  const groups = GROUPS.map(g => ({ label: g.label, items: g.keys.map(k => menu.find(i => itemKey(i) === k)).filter(Boolean) as MenuItem[] }));
  groups.forEach(g => g.items.forEach(i => { used[itemKey(i) || ''] = true; }));
  const rest = menu.filter(i => !used[itemKey(i) || '']);
  if (rest.length) { groups.push({ label: 'MORE', items: rest }); }
  const value = (item: MenuItem) => { const k = itemKey(item); if (k === 'playback' && alsa && alsa.output) { return alsa.output; } const net = Array.isArray(network) ? network[0] : network; if (k === 'network' && net && net.type) { return String(net.type); } return ''; };
  return (
    <>
      <nav className="aw-snav" aria-label="Settings">
        <div className="aw-snav__eyebrow mono">SETTINGS</div>
        {menu.map((item, i) => (
          <a key={i} className={'aw-snav__item' + (isActive(item) ? ' active' : '')} onClick={() => itemClick(item, nav)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { itemClick(item, nav); } }}>
            <Icon name={iconOf(item)} /><span className="aw-snav__label">{item.name}</span>
            {updates && itemKey(item) === 'plugins' ? <span className="aw-snav__badge mono" aria-label={updates + ' plugin updates'}>{updates}</span> : null}
          </a>
        ))}
        {systemInfo ? <div className="aw-snav__foot mono">OS {systemInfo.systemversion} · {String(systemInfo.hardware || '').toUpperCase()}</div> : null}
      </nav>
      {isLanding ? (
        <div className="aw-mnav">
          <PageHead variant="settings" nav={<nav className="aw-crumbs" aria-label="Breadcrumb"><span className="aw-crumbs__cur">Settings</span></nav>} />
          <div className="aw-mnav__head">
            <div className="aw-mnav__titles">
              <div className="aw-mnav__title">Settings</div>
              {systemInfo ? <div className="aw-mnav__sub mono">VOLUMIO OS {systemInfo.systemversion}{systemInfo.hardware ? <span>&nbsp;·&nbsp;{String(systemInfo.hardware).toUpperCase()}</span> : null}</div> : null}
            </div>
          </div>
          <SettingsSearch />
          {!searchQuery ? groups.filter(g => g.items.length).map(g => (
            <div key={g.label}>
              <div className="aw-mnav__eyebrow mono">{g.label}</div>
              <div className="aw-mnav__card">
                {g.items.map((item, i) => (
                  <a key={i} className="aw-mnav__row" onClick={() => itemClick(item, nav)}>
                    <Icon name={iconOf(item)} /><span className="aw-mnav__label">{item.name}</span>
                    {value(item) ? <span className="aw-mnav__value mono">{value(item).toUpperCase()}</span> : null}
                    {updates && itemKey(item) === 'plugins' ? <span className="aw-mnav__value aw-mnav__value--badge mono">{updates === 1 ? '1 UPDATE' : updates + ' UPDATES'}</span> : null}
                    <Icon name="chevron_right" className="aw-mnav__chev" />
                  </a>
                ))}
              </div>
            </div>
          )) : null}
        </div>
      ) : null}
    </>
  );
}
