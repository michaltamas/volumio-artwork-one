/** The phone menu sheet (mockup "Mobile — Menu"): the rail's destinations, the zone head, the power foot. */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { goToMyVolumio } from '../core/store/auth';
import Icon from './Icon';
import Spinner from './Spinner';
import { usePlayer } from '../core/store/player';
import { useUi } from '../core/store/ui';
import { useBrowse } from '../core/store/browse';
import { useMultiroom } from '../core/store/multiroom';
import { useSignal } from '../core/store/signal';
import { useMenu } from '../core/store/menu';
import { useModal } from '../core/store/modal';
import { useMenuSources, menuSources } from '../core/store/menuSources';
import SourceGlyph from './SourceGlyph';

export default function MobileMenu() {
  const open = useUi(s => s.menuOpen);
  const nav = useNavigate();
  const loc = useLocation();
  const sources = useBrowse(s => s.sources);
  const current = useBrowse(s => s.currentUri);
  useMenuSources(s => s.choices); useMenuSources(s => s.order);   // a switch in Appearance redraws the menu
  const inMenu = menuSources(sources, useMenuSources.getState().shown, useMenuSources.getState().order);
  const zone = useMultiroom(s => s.zones.find(z => z.isSelf)?.name || '');
  const output = useSignal(s => s.output);
  const shutdown = useMenu(s => s.byKey('shutdown'));
  const os = useMenu(s => s.systemInfo?.systemversion || '');
  useEffect(() => {
    if (!open) { return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { useUi.getState().hideMenu(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const hide = () => useUi.getState().hideMenu();
  const scanning = usePlayer(s => !!s.state.updatedb);
  const go = (p: string) => { hide(); nav(p); };
  const at = (p: string) => loc.pathname === p;
  const isSource = (uri: string) => at('/browse') && current === uri;
  const isSettings = loc.pathname.startsWith('/settings') || loc.pathname.startsWith('/plugin');
  return (
    <div className={'aw-mm' + (open ? ' open' : '')} aria-hidden={!open}>
      <div className="aw-mm__scrim" onClick={hide} />
      <div className="aw-mm__sheet" role="dialog" aria-label="Menu">
        <div className="aw-mm__head">
          <div className="aw-mm__brand">V</div>
          <div className="aw-mm__zone">
            <div className="aw-mm__zone-name">{zone || 'Volumio'}</div>
            {output ? <div className="aw-mm__zone-out mono">{output.toUpperCase()}</div> : null}
          </div>
          <button type="button" className="aw-mm__close" onClick={hide} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="aw-mm__eyebrow mono">LIBRARY</div>
        <div className="aw-mm__list">
          <a className={'aw-mm__item' + (at('/home') ? ' active' : '')} onClick={() => go('/home')}><Icon name="home" /><span className="aw-mm__label">Home</span></a>
          <a className={'aw-mm__item' + (at('/browse') && !inMenu.some(s => isSource(s.uri)) ? ' active' : '')} onClick={() => { useBrowse.getState().home(); go('/browse'); }}>
            <Icon name="album" /><span className="aw-mm__label">Music</span>{sources.length ? <span className="aw-mm__value mono">{sources.length}</span> : null}</a>
          {inMenu.map(s => <a key={s.uri} className={'aw-mm__item' + (isSource(s.uri) ? ' active' : '')} onClick={() => { useBrowse.getState().open(s, true); go('/browse'); }}><SourceGlyph source={s} /><span className="aw-mm__label">{String(s.name || s.title || s.uri)}</span></a>)}
          <a className={'aw-mm__item' + (at('/playback') ? ' active' : '')} onClick={() => go('/playback')}><Icon name="graphic_eq" /><span className="aw-mm__label">Now Playing</span></a>
        </div>
        <div className="aw-mm__eyebrow mono">SYSTEM</div>
        <div className="aw-mm__list">
          {scanning ? <a className="aw-mm__item aw-mm__item--scan" onClick={() => go('/plugin/miscellanea-my_music')}><span className="aw-mm__scan"><Spinner size={20} /></span><span className="aw-mm__label">Updating library</span></a> : null}
          <a className={'aw-mm__item' + (loc.pathname.startsWith('/myvolumio') ? ' active' : '')} onClick={() => { hide(); goToMyVolumio(nav); }}><Icon name="person" /><span className="aw-mm__label">MyVolumio</span></a>
          <a className={'aw-mm__item' + (at('/multi-room') ? ' active' : '')} onClick={() => go('/multi-room')}><Icon name="speaker" /><span className="aw-mm__label">Zones</span></a>
          <a className={'aw-mm__item' + (isSettings ? ' active' : '')} onClick={() => go('/settings')}><Icon name="tune" /><span className="aw-mm__label">Settings</span></a>
        </div>
        <div className="aw-mm__foot">
          {shutdown ? <a className="aw-mm__power" onClick={() => { hide(); useModal.getState().open('power-off', shutdown); }}><Icon name="power_settings_new" /><span>{shutdown.name}</span></a> : null}
          {os ? <span className="aw-mm__os mono">OS {os}</span> : null}
        </div>
      </div>
    </div>
  );
}
