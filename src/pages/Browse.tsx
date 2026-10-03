/**
 * The library page: the landing (with its search), the plain lists (artists, albums, genres,
 * folders, playlists, radio…) with breadcrumb, filter, view toggle, sort and alphabet rail, the
 * album / playlist page, the artist page, and the search page. One #browse, classed by state.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon';
import ServiceFilters, { hasServiceFilters, hasServiceSortings } from '../components/browse/ServiceFilters';
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import BrowseLanding, { streamingOf } from '../components/browse/BrowseLanding';
import AlbumHead, { AlbumPageHead, useCrumbs, goCrumb, isPlaylistInfo } from '../components/browse/AlbumHead';
import ArtistHead, { artistLists, norm } from '../components/browse/ArtistHead';
import BrowseLists from '../components/browse/BrowseLists';
import { albumart } from '../core/api';
import { emit } from '../core/socket';
import { useBrowse } from '../core/store/browse';

export default function Browse({ dedicated }: { dedicated?: boolean }) {
  const b = useBrowse();
  const crumbs = useCrumbs();
  const scroller = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');
  const [sortDesc, setSortDesc] = useState(false);
  const [activeLetter, setActiveLetter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [newest, setNewest] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const scope = useRef<{ from: any; searching: boolean; timer: number | null }>({ from: null, searching: false, timer: null });
  // rendered into #page-art-root (a top-level sibling of ArtStack, see App.tsx) rather than in
  // place: nested deep under #layout-container, a `z-index: -1` layer stacks under THAT
  // container's own z-index, not under ArtStack — Safari additionally never painted it there at
  // all (a fixed, negative-z-index descendant several stacking contexts deep is unreliable), so
  // the browsed cover's wash never showed. As a sibling of ArtStack with a plain z-index it paints
  // above it (later in DOM order) the same way in every engine.
  const [artRoot, setArtRoot] = useState<HTMLElement | null>(null);
  useEffect(() => { setArtRoot(document.getElementById('page-art-root')); }, []);

  const info = b.info;
  const uri = b.currentUri;
  const request = b.request;
  const listTitle = request ? (request.name || request.title || '') : '';
  const isPlaylist = !!info && isPlaylistInfo(info);
  // Spotify reports its playlists as info.type 'album' too: a playlist is a playlist, never an album
  const isAlbum = !!info && !isPlaylist && (info.type === 'album' || info.type === 'cd');
  const isArtist = !!info && info.type === 'artist';
  const hideInfo = dedicated;
  const isPlainList = !!(b.isBrowsing && !b.isSearching && !info && listTitle);
  const isLandingSearch = !!(b.isSearching && !b.isBrowsing);
  const artistsPage = uri === 'artists://';
  const lists = b.lists || [];
  const count = (() => { try { return lists[0].items.length; } catch { return 0; } })();
  // a plain list (Last 100, Favourites, a genre/folder's tracks, search results…) still renders
  // its rows through MusicRow like an album or playlist, but only actually IS a track listing
  // when its rows are songs — the same component (and #browse.browsing-list class) also carries
  // albums/artists/playlists shown as rows instead of cards, which have no "album" field of their
  // own to put in a column, so the number+album-column treatment only turns on for real tracks
  const isTrackList = isPlaylist || ((isPlainList || isLandingSearch) && lists[0] && lists[0].items && lists[0].items[0] && lists[0].items[0].type === 'song');

  // the search page: Volumio's own search box in the head
  // Backspace outside a text field goes back one level, as the frame's browse controllers did
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode !== 8) { return; }
      const d = e.target as HTMLElement;
      const tag = (d.tagName || '').toUpperCase();
      const type = ((d as HTMLInputElement).type || '').toUpperCase();
      let prevent: boolean;
      if ((tag === 'INPUT' && ['TEXT', 'PASSWORD', 'FILE', 'SEARCH', 'EMAIL', 'NUMBER', 'DATE'].indexOf(type) > -1) || tag === 'TEXTAREA') { prevent = (d as HTMLInputElement).readOnly || (d as HTMLInputElement).disabled; }
      else { prevent = true; }
      if (prevent) { e.preventDefault(); useBrowse.getState().goBack(); }
    };
    document.addEventListener('keydown', onKey, false);
    return () => document.removeEventListener('keydown', onKey, false);
  }, []);
  useEffect(() => { b.setDedicated(!!dedicated); if (dedicated) { window.setTimeout(() => searchInput.current && searchInput.current.focus(), 100); } return () => { if (dedicated) { useBrowse.getState().setDedicated(false); } }; }, [dedicated]); // eslint-disable-line react-hooks/exhaustive-deps

  // a new page: the local filter, the order and the artist page's state start over
  const lastUri = useRef<string | null>(null);
  useEffect(() => {
    if (lastUri.current !== uri) {
      lastUri.current = uri;
      setFilter(''); setSortDesc(false); setActiveLetter(''); setShowAll(false); setNewest(true);
      if (!scope.current.searching) { scope.current.from = null; }
      scope.current.searching = false;
    }
  }, [uri, b.stamp]);
  // the scroll position of a page comes back with it
  useEffect(() => {
    const el = scroller.current; if (!el) { return; }
    el.scrollTop = (uri && b.scroll[uri]) || 0;
  }, [b.stamp]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => { const el = scroller.current; if (el && uri) { useBrowse.setState({ scroll: { ...useBrowse.getState().scroll, [uri]: el.scrollTop } }); } };

  // the head field: on a streaming service's pages it asks the service (Volumio's search, scoped); elsewhere it filters the rows
  const service = useMemo(() => {
    const r: any = request || {}; if (!r.uri) { return null; }
    // Web Radio's directory is searched, not filtered: its pages list categories, the stations are behind them
    // (a user's own lists — My Web Radios, Favorite Radios — are short, and filtered as any list)
    const u = String(r.uri);
    if (u === 'radio' || (u.indexOf('radio/') === 0 && u !== 'radio/myWebRadio' && u !== 'radio/favourites')) { return b.sources.find(s => s.uri === 'radio') || null; }
    return streamingOf(b.sources).find(s => (s.plugin_name && (s.plugin_name === r.plugin_name || s.plugin_name === r.service)) || (s.service && s.service === r.service) || (s.uri && String(r.uri) === s.uri) || (s.uri && String(r.uri).indexOf(s.uri + '/') === 0) || (s.uri && String(r.uri).indexOf(s.uri + ':') === 0)) || null;
  }, [request, b.sources]);
  const placeholder = service ? 'Search ' + (service.name || service.title || '') : 'Filter ' + String(listTitle || '').toLowerCase();
  const headInput = (v: string) => {
    setFilter(v);
    if (!service) { return; }
    const q = v.trim(); const sc = scope.current;
    if (sc.timer) { window.clearTimeout(sc.timer); sc.timer = null; }
    if (!q) { const from = sc.from; sc.from = null; sc.searching = false; if (from && from.uri) { emit('browseLibrary', { uri: from.uri }); } return; }
    if (q.length < 2) { return; }
    const r: any = request;
    if (!sc.from) { sc.from = r; }
    sc.timer = window.setTimeout(() => { sc.searching = true; emit('search', { type: 'any', value: q, service: r.service || service.service || service.plugin_name, plugin_name: service.plugin_name || r.plugin_name, plugin_type: service.plugin_type || r.plugin_type || 'music_service', uri: service.uri }); }, 400);
  };
  const q = service ? '' : norm(filter).trim();
  const visibleCount = useMemo(() => {
    if (!q) { return null; }
    let n = 0;
    lists.forEach((l, li) => { if (isArtist && artistLists(lists, 'albums').some(x => x.i === li)) { return; } (l.items || []).forEach(it => { if (norm(it.title || it.name).indexOf(q) > -1) { n++; } }); });
    return n;
  }, [q, lists, isArtist]);
  const visibleTracks = useMemo(() => {
    const songs = artistLists(lists, 'songs');
    return songs.reduce((n, { l }) => n + (l.items || []).filter(it => !q || norm(it.title || it.name).indexOf(q) > -1).length, 0);
  }, [q, lists]);
  const letters = useMemo(() => {
    const items = (lists[0] && lists[0].items) || [];
    const seen: Record<string, boolean> = {};
    items.forEach(it => { const c = norm(it.title || it.name).charAt(0).toUpperCase(); if (/[A-Z0-9]/.test(c)) { seen[c] = true; } });
    const out = Object.keys(seen).sort();
    return sortDesc ? out.reverse() : out;
  }, [lists, sortDesc]);
  const jumpTo = (letter: string) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('#browse-page .music-card__wrapper:not(.placeholder-wrapper):not(.aw-hidden), #browse-page .main__source:not(.aw-artist-albums) .album__tracks:not(.aw-hidden)'));
    const titleOf = (el: HTMLElement) => { const t = el.querySelector('.music-card__label, .item__title'); return t ? (t.textContent || '').trim() : ''; };
    const target = nodes.find(el => norm(titleOf(el)).charAt(0).toUpperCase() === letter);
    if (target) { setActiveLetter(letter); target.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  };
  const onMenuOpen = (key: string, open: boolean) => setActiveMenu(cur => open ? key : (cur === key ? null : cur));

  const cls = ['boxTable',
    isAlbum ? 'browsing-album' : '', isPlaylist ? 'browsing-playlist' : '',
    (!b.isBrowsing && !b.isSearching) ? 'browsing-home' : '', isLandingSearch ? 'browsing-search' : '',
    artistsPage ? 'browsing-artists' : '', isArtist ? 'browsing-artist' : '', (showAll || filter) ? 'aw-artist-all' : '', isPlainList ? 'browsing-list' : '', isTrackList ? 'aw-tracklist' : ''].filter(Boolean).join(' ');
  const showAlbumBg = !!(info && !hideInfo && info.albumart && (isAlbum || info.type === 'song' || isPlaylist));

  // the list's own order; beside a service's genre menu it joins that group, so both sit on one line
  const localSort = (
    <button type="button" className="aw-sort" onClick={() => setSortDesc(v => !v)} title="Sort order">
      <span className="aw-sort__k">Sort</span><span className="aw-sort__v">{sortDesc ? 'Z–A' : 'A–Z'}</span><Icon name="expand_more" />
    </button>
  );
  return (
    <div id="browse" className={cls}>
      {showAlbumBg && artRoot ? createPortal(<div className="aw-albumhead__bg" aria-hidden="true"><img src={albumart(info!.albumart)} alt="" /></div>, artRoot) : null}
      <div className="panel panel-default">
        <div className={'body-content new-browse' + (dedicated ? ' with-search-header' : '')}>
          <div id="browseTablesWrapper" ref={scroller} onScroll={onScroll}>

            {dedicated ? (
              <PageHead variant="search" nav={<div className="dedicated-search"><div className="search-container">
                <form action="." id="searchForm" onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement)?.blur(); }}>
                  <input type="search" id="search-input-form" ref={searchInput} className="form-control" value={b.searchField} onChange={(e) => b.search(e.target.value)} placeholder="Search ..." title="Search" spellCheck={false} />
                </form>
                <button type="button" className="search-icon" onMouseDown={(e) => { if (b.searchField.length) { e.preventDefault(); b.search(''); } }}><Icon name={b.searchField.length ? 'cancel' : 'search'} /></button>
              </div></div>} />
            ) : null}

            {!b.isBrowsing ? <BrowseLanding dedicated={dedicated} /> : null}

            {info && !hideInfo && (isAlbum || info.type === 'song' || isPlaylist) ? <AlbumPageHead /> : null}
            {info && !hideInfo ? (
              <div className="aw-headwrap">
                {isArtist ? <ArtistHead filter={filter} onFilter={setFilter} showAll={showAll} onShowAll={() => setShowAll(v => !v)} newest={newest} onToggleOrder={() => setNewest(v => !v)} visibleTracks={visibleTracks} onMenuOpen={onMenuOpen} /> : null}
                {isAlbum || info.type === 'song' || isPlaylist ? <AlbumHead /> : null}
              </div>
            ) : null}

            {isPlainList ? (
              <PageHead variant="list" back={() => b.goBack()}
                nav={<Crumbs trail={crumbs} current={listTitle} onHome={() => b.backHome()} onCrumb={goCrumb} />}
                actions={<>
                  <label className={'aw-filter' + (filter.length ? ' aw-filter--on' : '')}>
                    <Icon name="search" />
                    <input type="search" value={filter} onChange={(e) => headInput(e.target.value)} placeholder={placeholder} aria-label={placeholder} spellCheck={false} />
                  </label>
                  {b.showGridViewSelector() ? (
                    <div className="aw-viewtoggle" role="group" aria-label="View">
                      <button type="button" className={b.showGridView ? 'active' : ''} onClick={() => b.setGridView(true)} aria-label="Grid" title="Grid"><Icon name="grid_view" /></button>
                      <button type="button" className={!b.showGridView ? 'active' : ''} onClick={() => b.setGridView(false)} aria-label="List" title="List"><Icon name="list" /></button>
                    </div>
                  ) : null}
                </>} />
            ) : null}

            {isPlainList ? (
              <div className="aw-listhead">
                <h1 className="aw-listhead__title">{listTitle}</h1>
                {count ? <span className="aw-listhead__count mono">{visibleCount !== null ? visibleCount + ' / ' : ''}{count}</span> : null}
                {hasServiceFilters(b.lists)
                  ? <ServiceFilters>{!hasServiceSortings(b.lists) ? localSort : null}</ServiceFilters>
                  : localSort}
              </div>
            ) : null}

            {isPlainList && artistsPage && !b.showGridView ? <div className="aw-cols aw-cols--artists mono" aria-hidden="true"><span>#</span><span /><span>ARTIST</span><span /></div> : null}
            {isTrackList ? <div className="aw-cols mono aw-cols--fav" aria-hidden="true"><span>#</span><span /><span className="aw-cols__info"><span>TITLE</span><span>ALBUM</span></span><span className="aw-cols__duration">DURATION</span><span /><span /></div> : null}

            <div id="browse-page">
              {(b.isBrowsing || b.isSearching) && b.lists ? <BrowseLists lists={lists} filter={filter} sortDesc={sortDesc} isArtist={isArtist} artistsPage={artistsPage} serviceSearch={!!service} activeMenu={activeMenu} onMenuOpen={onMenuOpen} /> : null}
            </div>

            {isPlainList && letters.length > 1 ? (
              <nav className="aw-alpha mono" aria-label="Jump to letter">
                {letters.map(l => <button type="button" key={l} className={l === activeLetter ? 'active' : ''} onClick={() => jumpTo(l)}>{l}</button>)}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
