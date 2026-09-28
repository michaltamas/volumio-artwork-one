import { BrowserRouter, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import ArtStack from './components/ArtStack';
import Rail from './components/Rail';
import MiniPlayer from './components/MiniPlayer';
import QueuePanel from './components/QueuePanel';
import OutputsSheet from './components/OutputsSheet';
import MobileMenu from './components/MobileMenu';
import ModalHost from './components/ModalHost';
import NowPlaying from './pages/NowPlaying';
import Home from './pages/Home';
import PlayQueue from './pages/PlayQueue';
import Wizard from './pages/Wizard';
import Browse from './pages/Browse';
import Zones from './pages/Zones';
import Settings from './pages/Settings';
import PluginPage from './pages/PluginPage';
import PluginManager from './pages/PluginManager';
import { StaticPage, IframePage } from './pages/StaticPage';
import SettingsNav from './components/settings/SettingsNav';
import SettingsSide from './components/settings/SettingsSide';
import { useSettings } from './core/store/settings';
import Toasts from './components/Toasts';
import UndoToast from './components/UndoToast';
import AmbientDisplay from './components/AmbientDisplay';
import ConnectionLost from './components/ConnectionLost';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrowse } from './core/store/browse';
import { useUi } from './core/store/ui';
import MyVolumio, { myVolumioState } from './pages/myvolumio/MyVolumio';

function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  // ⌘K / Ctrl+K: the library's search, from anywhere
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); useBrowse.getState().backHome(); useUi.setState({ searchFocus: true }); nav('/browse'); const el = document.getElementById('aw-search-input') as HTMLInputElement | null; if (el) { el.focus(); el.select(); } } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [nav]);
  const page = loc.pathname.replace(/^\//, '').split('/')[0] || 'home';
  // Now Playing is a sheet over the page: the page beneath stays mounted with its data and
  // scroll, hidden while the sheet is up, shown again untouched when it goes
  const isNp = page === 'playback';
  const npLeaving = useUi(s => s.npLeaving);
  const covered = isNp && !npLeaving;   // while the sheet slides away the page is already back
  const under = useRef<Location>({ pathname: '/home', search: '', hash: '', state: null, key: 'under' });
  if (!isNp) { under.current = loc; }
  const underPage = under.current.pathname.replace(/^\//, '').split('/')[0] || 'home';
  useEffect(() => { if (!isNp) { useUi.setState({ underPath: loc.pathname + loc.search }); } }, [isNp, loc]);
  const contentScroll = useRef(0);
  useLayoutEffect(() => {
    const c = document.getElementById('content'); if (!c) { return; }
    if (covered) { contentScroll.current = c.scrollTop; c.scrollTop = 0; }
    else { c.scrollTop = contentScroll.current; }
  }, [covered]);
  // the wrapper's state classes follow the page beneath as soon as it is uncovered (the sheet slides over a styled page)
  const shownPage = covered ? page : underPage;
  const shownPath = covered ? loc.pathname : under.current.pathname;
  const shell = shownPage === 'settings' || shownPage === 'plugin' || shownPage === 'plugin-manager';
  const hasSide = useSettings(s => s.hasSide());
  useEffect(() => { if (page === 'settings') { useSettings.setState({ route: { name: 'volumio.settings', pluginName: '' } }); } }, [page]);
  return (
    <>
      <ArtStack />
      <div id="page-art-root" />
      <div id="wizardScrim" />
      <div id="layout-container">
        <Rail />
        <div id="contentWrapper" className={(shownPage === 'myvolumio' ? 'aw-state-myvolumio-' + myVolumioState(shownPath) : 'aw-state-volumio-' + shownPage) + (shell ? ' aw-settings-shell' : '') + (shell && !hasSide ? ' aw-settings-shell--noside' : '')}>
          {shell ? <div className="aw-settings-nav"><SettingsNav /></div> : null}
          <div id="content" className={covered ? 'playback' : underPage}>
            <div className={'aw-under' + (covered ? ' aw-under--covered' : '')} aria-hidden={covered || undefined}>
            <Routes location={isNp ? under.current : loc}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/search" element={<Browse dedicated />} />
              <Route path="/playback" element={<Home />} />
              <Route path="/queue" element={<PlayQueue />} />
              <Route path="/wizard" element={<Wizard />} />
              <Route path="/multi-room" element={<Zones />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plugin/:pluginName" element={<PluginPage />} />
              <Route path="/plugin-manager" element={<PluginManager />} />
              <Route path="/static-page/:pageName" element={<StaticPage />} />
              <Route path="/iframe-page/:url" element={<IframePage />} />
              <Route path="/iframe-page" element={<Navigate to="/playback" replace />} />
              <Route path="/myvolumio/*" element={<MyVolumio />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            </div>
            {isNp ? <NowPlaying /> : null}
          </div>
          {/* only rendered when the shell actually has 3 grid columns (aw-settings-shell--noside
             drops to 2) — mounted anyway, this element has nowhere to go but wraps onto a new
             row, which steals height from row 1 and leaves .aw-snav short of the mini-player */}
          {shell && hasSide ? <div className="aw-settings-side"><SettingsSide /></div> : null}
        </div>
        <QueuePanel />
        <MobileMenu />
        <MiniPlayer />
      </div>
      <OutputsSheet />
      <ModalHost />
      <Toasts />
      <UndoToast />
      <AmbientDisplay />
      <ConnectionLost />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
