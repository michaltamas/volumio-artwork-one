/** The rail (spec §5.1): Home, Music, the library's own sources, Now Playing; MyVolumio, zones and
 *  settings below. Icons only, or icons with labels — the toggle at the foot switches, per browser. */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { goToMyVolumio } from '../core/store/auth';
import Icon from './Icon';
import { useBrowse } from '../core/store/browse';
import { useMenu } from '../core/store/menu';
import { useUi } from '../core/store/ui';

function Item({ icon, label, active, open, onClick }: { icon: string; label: string; active: boolean; open: boolean; onClick: () => void }) {
  return (
    <li>
      <a onClick={onClick} aria-label={label} title={open ? undefined : label} className={active ? 'active' : ''}>
        <Icon name={icon} /><span className="rail__label">{label}</span>
      </a>
    </li>
  );
}

export default function Rail() {
  const nav = useNavigate();
  const loc = useLocation();
  const sources = useBrowse(s => s.sources);
  const current = useBrowse(s => s.currentUri);
  const myVolumio = useMenu(s => s.hasMyVolumio());
  const open = useUi(s => s.railOpen);
  // the whole layout (head, page, mini player) follows the rail's width through --rail-w
  useEffect(() => { document.documentElement.classList.toggle('aw-rail-open', open); }, [open]);
  const at = (p: string) => loc.pathname === p;
  const source = (uri: string) => sources.find(s => s.uri === uri) || null;
  const sourceActive = (uri: string) => at('/browse') && current === uri;
  const goSource = (uri: string) => { const s = source(uri); if (s) { useBrowse.getState().open(s, true); nav('/browse'); } };
  const goMusic = () => { useBrowse.getState().home(); nav('/browse'); };
  return (
    <div id="main-menu">
      <div className="brand-row">
        <div className="brand" onClick={() => nav('/home')} role="link" tabIndex={0} aria-label="Volumio">V</div>
        <span className="rail__label rail__label--brand">Volumio</span>
      </div>
      <ul className="main-menu-list">
        <Item icon="home" label="Home" open={open} active={at('/home')} onClick={() => nav('/home')} />
        <Item icon="album" label="Music" open={open} active={at('/browse') && !sourceActive('playlists') && !sourceActive('favourites')} onClick={goMusic} />
        {source('playlists') && <Item icon="playlist_play" label="Playlists" open={open} active={sourceActive('playlists')} onClick={() => goSource('playlists')} />}
        {source('favourites') && <Item icon="favorite" label="Favourites" open={open} active={sourceActive('favourites')} onClick={() => goSource('favourites')} />}
        <Item icon="graphic_eq" label="Now Playing" open={open} active={at('/playback')} onClick={() => nav('/playback')} />
      </ul>
      <ul className="main-menu-bottom">
        {myVolumio && <Item icon="person" label="MyVolumio" open={open} active={loc.pathname.startsWith('/myvolumio')} onClick={() => goToMyVolumio(nav)} />}
        <Item icon="speaker" label="Zones" open={open} active={at('/multi-room')} onClick={() => nav('/multi-room')} />
        <Item icon="tune" label="Settings" open={open} active={loc.pathname.startsWith('/settings') || loc.pathname.startsWith('/plugin')} onClick={() => nav('/settings')} />
        <li className="rail__toggle">
          <a onClick={() => useUi.getState().toggleRail()} aria-label={open ? 'Collapse menu' : 'Expand menu'} title={open ? undefined : 'Expand menu'} aria-expanded={open}>
            <Icon name={open ? 'left_panel_close' : 'left_panel_open'} /><span className="rail__label">Collapse</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
