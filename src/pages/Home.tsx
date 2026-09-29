/**
 * Home (spec §6.2): the tabs and the search pill, "Pick up where you left off", the recent
 * albums shelf (Last_100 resolved to library albums), and the pinned shelf.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import PageHead from '../components/PageHead';
import Dropdown from '../components/Dropdown';
import { usePlayer } from '../core/store/player';
import { useBrowse, type BrowseItem } from '../core/store/browse';
import { usePins, pinEyebrow, pinGlyph, type Pin } from '../core/store/pins';
import { useQueue } from '../core/store/queue';
import { useUi } from '../core/store/ui';
import { albumart, rest } from '../core/api';

const BUILT_IN = ['favourites', 'playlists', 'music-library', 'artists://', 'albums://', 'genres://', 'upnp', 'Last_100', 'radio'];
const SHELF = 6;

async function lists(uri?: string): Promise<any[]> {
  const r = await rest<any>('browse', uri ? { uri } : undefined);
  return (r && r.navigation && r.navigation.lists) || [];
}

export default function Home() {
  const nav = useNavigate();
  const st = usePlayer(s => s.state);
  const pins = usePins(s => s.list);
  const [sources, setSources] = useState<BrowseItem[]>([]);
  const [recent, setRecent] = useState<BrowseItem[]>([]);
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState(false);
  const [lifted, setLifted] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    lists().then(l => { if (alive) { setSources(l.filter((s: any) => s && s.uri)); } });
    // recently played albums: Last_100 tracks → unique (artist, album) in play order → the library album
    Promise.all([lists('Last_100'), lists('albums://')]).then(([recentLists, albumLists]) => {
      if (!alive) { return; }
      const key = (i: any) => (String(i.artist || '') + '|' + String(i.album || i.title || '')).toLowerCase();
      const albums: Record<string, BrowseItem> = {};
      albumLists.forEach((l: any) => (l.items || []).forEach((a: any) => { albums[(String(a.artist || '') + '|' + String(a.title || '')).toLowerCase()] = a; }));
      const seen: Record<string, boolean> = {}; const out: BrowseItem[] = [];
      recentLists.forEach((l: any) => (l.items || []).forEach((t: any) => { const k = key(t); if (!t.album || seen[k]) { return; } seen[k] = true; const a = albums[k]; if (a) { out.push(a); } }));
      setRecent(out.slice(0, 24)); setPage(0);
    });
    return () => { alive = false; };
  }, []);

  const continueTitle = st.album || st.title || '';
  const continueArt = albumart(st.albumart);
  const streaming = sources.filter(s => BUILT_IN.indexOf(s.uri) === -1);
  const radio = sources.find(s => s.uri === 'radio');
  const openSource = (s: BrowseItem) => { useBrowse.getState().open(s, true); nav('/browse'); };
  const pages = Math.ceil(recent.length / SHELF);
  const shelf = recent.slice(page * SHELF, page * SHELF + SHELF);
  const openPin = (p: Pin) => {
    if (p.type === 'webradio' || p.type === 'mywebradio') { useQueue.getState().addToQueue(p); usePlayer.getState().play(); return; }
    openSource({ uri: p.uri, service: p.service, type: p.type, title: p.title, name: p.title, albumart: p.albumart, artist: p.artist, album: p.album });
  };
  // drag to reorder: the lifted tile follows the pointer; crossing another tile moves it there
  const pinDragStart = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    if (!edit || (e.button && e.button !== 0)) { return; }
    e.preventDefault();
    const tile = e.currentTarget; let from = i;
    try { tile.setPointerCapture(e.pointerId); } catch { /* older engines */ }
    const x0 = e.clientX, y0 = e.clientY; setLifted(i);
    const move = (ev: PointerEvent) => {
      tile.style.transform = `translate(${ev.clientX - x0}px, ${ev.clientY - y0}px) rotate(-2deg) scale(1.03)`;
      const under = document.elementsFromPoint(ev.clientX, ev.clientY).find(el => el !== tile && el.classList && el.classList.contains('home-pin')) as HTMLElement | undefined;
      if (under) { const to = parseInt(under.getAttribute('data-index') || '', 10); if (!isNaN(to) && to !== from) { usePins.getState().move(from, to); from = to; setLifted(to); } }
    };
    const end = () => { tile.removeEventListener('pointermove', move); tile.removeEventListener('pointerup', end); tile.removeEventListener('pointercancel', end); tile.style.transform = ''; setLifted(null); };
    tile.addEventListener('pointermove', move); tile.addEventListener('pointerup', end); tile.addEventListener('pointercancel', end);
  };
  const goSearch = () => { useBrowse.getState().home(); useUi.setState({ searchFocus: true }); nav('/browse'); };

  return (
    <div id="artwork-home">
      <PageHead variant="start"
        nav={<>
          <div className="aw-tab active">Library</div>
          {streaming.map(s => <div key={s.uri} className="aw-tab" onClick={() => openSource(s)}>{s.name}</div>)}
          {radio ? <div className="aw-tab" onClick={() => openSource(radio)}>Radio</div> : null}
        </>}
        actions={<div className="aw-search" onClick={goSearch} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { goSearch(); } }}>
          <Icon name="search" /><span className="aw-search-label">Search everything</span><span className="aw-search-key mono">⌘K</span>
        </div>} />

      {/* on the phone the label is the section's own line, as PINNED and RECENT ALBUMS are; beside the cover it wrapped */}
      {continueArt && continueTitle ? <div className="home-eyebrow home-eyebrow--row mono">PICK UP WHERE YOU LEFT OFF</div> : null}
      {continueArt && continueTitle ? (
        <div className="home-hero">
          <div className="home-hero-cover"><img src={continueArt} alt={continueTitle} /></div>
          <div className="home-hero-meta">
            <div className="home-eyebrow mono">PICK UP WHERE YOU LEFT OFF</div>
            <div className="home-hero-title">{continueTitle}</div>
            <div className="home-hero-actions">
              <button className="home-resume" onClick={() => { if (st.status !== 'play') { usePlayer.getState().play(); } nav('/playback'); }}><Icon name="play_arrow" /><span>Resume</span></button>
              {st.artist ? <span className="home-hero-sub">{st.artist}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {pins.length ? (
        <div className={'home-shelf home-pins' + (edit ? ' is-editing' : '')}>
          <div className="home-shelf-head">
            <span className="mono home-shelf-title">PINNED</span>
            <span className="mono home-pins-count">{pins.length}</span>
            <button type="button" className="home-pins-edit" onClick={() => setEdit(v => !v)}>{edit ? 'Done' : 'Edit'}</button>
          </div>
          <div className="main__row">
            {pins.map((p, i) => {
              const art = p.albumart ? albumart(p.albumart) : '';
              const station = p.type === 'webradio' || p.type === 'mywebradio';
              return (
                <div className={'music-card__wrapper home-pin' + (lifted === i ? ' is-lifted' : '')} key={p.uri} data-index={i} onPointerDown={(e) => pinDragStart(e, i)} title={p.title}>
                  <div className="music-card" onClick={() => { if (!edit) { openPin(p); } }}>
                    <div className="music-card__header">
                      {art ? <img className="music-card__img" src={art} alt="" onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.style.display = 'none'; (img.nextElementSibling as HTMLElement).style.display = 'grid'; }} /> : null}
                      <div className="home-pin__glyph" style={{ display: art ? 'none' : 'grid' }}><Icon name={pinGlyph(p)} /></div>
                      <Dropdown className="home-pin__menu" toggleClass="home-pin__more" toggle={<Icon name="more_horiz" />}
                        entries={[{ icon: station ? 'play_arrow' : 'open_in_new', label: station ? 'Play' : 'Open', onClick: () => openPin(p) }, { label: '-', onClick: () => {} }, { icon: 'push_pin', label: 'Unpin', danger: true, onClick: () => usePins.getState().unpin(p) }]} />
                    </div>
                    <div className="music-card__info"><div className="music-card__label" title={p.title}>{p.title}</div></div>
                    <p className="music-card__meta">{pinEyebrow(p)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {recent.length ? (
        <div className="home-shelf">
          <div className="home-shelf-head">
            <span className="mono home-shelf-title">RECENT ALBUMS</span>
            {pages > 1 ? (
              <div className="home-shelf-nav">
                <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page <= 0} aria-label="Previous"><Icon name="chevron_left" /></button>
                <button type="button" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next"><Icon name="chevron_right" /></button>
              </div>
            ) : null}
          </div>
          <div className="main__row">
            {shelf.map(album => (
              <div className="music-card__wrapper" key={album.uri}>
                <div className="music-card" onClick={() => openSource(album)}>
                  <div className="music-card__header">
                    <img className="music-card__img" src={albumart(album.albumart)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <div className="music-card__overlay"><div className="meta__play"><button className="ghost-btn play-btn"><Icon name="play_arrow" className="play-btn__icon" /></button></div></div>
                  </div>
                  <div className="music-card__info"><div className="music-card__label" title={album.title || album.album}>{album.title || album.album}</div></div>
                  <p className="music-card__meta">{album.artist || ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
