/**
 * The Browse landing (mockup 2b-browse): every card a real source; counts, stats and tile
 * artwork come from the REST API. The search pill is a real field: Volumio's global search,
 * results render on this page.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import PageHead from '../PageHead';
import { albumart, rest } from '../../core/api';
import { useBrowse, type BrowseItem } from '../../core/store/browse';
import { useUi } from '../../core/store/ui';

// Settings → Sources (Volumio's My Music page): network drives, USB, the library's sources
const SOURCES_SETTINGS = '/plugin/miscellanea-my_music';

export const BUILT_IN = ['favourites', 'playlists', 'music-library', 'artists://', 'albums://', 'genres://', 'upnp', 'Last_100', 'radio'];
export const streamingOf = (sources: BrowseItem[]) => sources.filter(s => BUILT_IN.indexOf(s.uri) === -1);

interface Home { stats: any; albumsArt: string[]; artistsArt: string[]; playlistArt: string | null; counts: Record<string, number> }

export default function BrowseLanding({ dedicated }: { dedicated?: boolean }) {
  const nav = useNavigate();
  const sources = useBrowse(s => s.sources);
  const searchField = useBrowse(s => s.searchField);
  const isSearching = useBrowse(s => s.isSearching);
  const lists = useBrowse(s => s.lists);
  const [home, setHome] = useState<Home>({ stats: null, albumsArt: [], artistsArt: [], playlistArt: null, counts: {} });
  const [logoFail, setLogoFail] = useState<Record<string, boolean>>({});
  const input = useRef<HTMLInputElement>(null);
  const source = (uri: string) => sources.find(s => s.uri === uri) || null;
  const fetch = (s: BrowseItem | null) => { if (s) { useBrowse.getState().fetch(s); } };
  const streaming = streamingOf(sources);

  useEffect(() => {
    let alive = true;
    const items = (j: any) => { try { return j.navigation.lists[0].items || []; } catch { return []; } };
    const art = (i: any) => albumart(i.albumart);
    const up = (f: (h: Home) => Partial<Home>) => { if (alive) { setHome(h => ({ ...h, ...f(h) })); } };
    rest<any>('collectionstats').then(s => { if (s && s.albums !== undefined) { up(() => ({ stats: s })); } });
    rest<any>('browse', { uri: 'albums://' }).then(j => up(() => ({ albumsArt: items(j).slice(0, 8).map(art) })));
    rest<any>('browse', { uri: 'artists://' }).then(j => up(() => ({ artistsArt: items(j).slice(0, 2).map(art) })));
    rest<any>('browse', { uri: 'favourites' }).then(j => up(h => ({ counts: { ...h.counts, favourites: items(j).length } })));
    rest<any>('browse', { uri: 'playlists' }).then(j => { const it = items(j); up(h => ({ counts: { ...h.counts, playlists: it.length }, playlistArt: it[0] && it[0].albumart ? art(it[0]) : h.playlistArt })); });
    rest<any>('browse', { uri: 'genres://' }).then(j => up(h => ({ counts: { ...h.counts, genres: items(j).length } })));
    return () => { alive = false; };
  }, []);
  // ⌘K from Home lands here with the field focused
  useEffect(() => {
    if (useUi.getState().searchFocus && input.current) { input.current.focus(); input.current.select(); useUi.setState({ searchFocus: false }); }
  }, []);

  const s = home.stats;
  const h = s ? parseInt(String(s.playtime || '').split(':')[0], 10) : NaN;
  const statsLine = s ? `${s.artists} ARTISTS · ${s.albums} ALBUMS` + (isNaN(h) ? '' : ` · ${h} H`) : '';
  const landingSearch = isSearching;
  const searchCount = (lists || []).reduce((n, l) => n + ((l.items || []).length), 0);

  return (
    <div className="aw-browse">
      {!dedicated ? (
        <PageHead variant="home"
          nav={<>
            {/* the same row as Home's: Home, Library (here), the sources */}
            <div className="aw-tab" onClick={() => nav('/home')}>Home</div>
            <div className="aw-tab active" aria-current="page">Library</div>
            {streaming.map(x => <div key={x.uri} className="aw-tab" onClick={() => fetch(x)}>{x.name}</div>)}
            {source('radio') ? <div className="aw-tab" onClick={() => fetch(source('radio'))}>Radio</div> : null}
          </>}
          actions={<label className={'aw-search' + (searchField.length ? ' active' : '')}>
            <Icon name="search" />
            <input id="aw-search-input" ref={input} type="search" value={searchField} onChange={(e) => useBrowse.getState().search(e.target.value)}
              placeholder={s ? 'Search ' + s.songs + ' tracks' : 'Search everything'} aria-label="Search" autoComplete="off" spellCheck={false} />
            {!searchField.length ? <span className="aw-search-key mono">⌘K</span> : null}
            {searchField.length ? <button type="button" className="aw-search-clear" onClick={() => useBrowse.getState().clearSearch()} aria-label="Clear search"><Icon name="close" /></button> : null}
          </label>} />
      ) : null}

      {landingSearch ? (
        <div className="aw-listhead aw-listhead--search">
          <h1 className="aw-listhead__title">Results</h1>
          {searchCount ? <span className="aw-listhead__count mono">{searchCount}</span> : null}
        </div>
      ) : (
        <div>
          <div className="aw-browse-head">
            <h1 className="aw-browse-title">Browse</h1>
            {statsLine ? <div className="aw-browse-stats mono">{statsLine}</div> : null}
          </div>

          <div className="aw-cards">
            {source('albums://') ? (
              <div className="aw-card" onClick={() => fetch(source('albums://'))}>
                <div className="aw-tile aw-tile--mosaic">
                  {home.albumsArt.map((a, i) => <img key={i} src={a} alt="" onError={(e) => e.currentTarget.remove()} />)}
                  <Icon name="album" className="aw-tile__glyph" />
                </div>
                <div className="aw-card-body"><div className="aw-card-title">Albums</div>{s ? <div className="aw-card-sub">{s.albums} albums</div> : null}</div>
                <Icon name="chevron_right" className="aw-card-chev" />
              </div>
            ) : null}
            {source('artists://') ? (
              <div className="aw-card" onClick={() => fetch(source('artists://'))}>
                <div className="aw-tile aw-tile--avatars">
                  {home.artistsArt.map((a, i) => <img key={i} src={a} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
                  <Icon name="mic_external_on" className="aw-tile__glyph" />
                </div>
                <div className="aw-card-body"><div className="aw-card-title">Artists</div>{s ? <div className="aw-card-sub">{s.artists} artists</div> : null}</div>
                <Icon name="chevron_right" className="aw-card-chev" />
              </div>
            ) : null}
            {source('favourites') ? (
              <div className="aw-card" onClick={() => fetch(source('favourites'))}>
                <div className="aw-tile aw-tile--icon"><Icon name="favorite" /></div>
                <div className="aw-card-body"><div className="aw-card-title">Favourites</div>{home.counts.favourites !== undefined ? <div className="aw-card-sub">{home.counts.favourites} tracks</div> : null}</div>
                <Icon name="chevron_right" className="aw-card-chev" />
              </div>
            ) : null}
            {source('playlists') ? (
              <div className="aw-card" onClick={() => fetch(source('playlists'))}>
                {home.playlistArt ? <div className="aw-tile aw-tile--stack"><img src={home.playlistArt} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><Icon name="queue_music" className="aw-tile__glyph" /></div>
                  : <div className="aw-tile aw-tile--icon"><Icon name="queue_music" /></div>}
                <div className="aw-card-body"><div className="aw-card-title">Playlists</div>{home.counts.playlists !== undefined ? <div className="aw-card-sub">{home.counts.playlists} playlists</div> : null}</div>
                <Icon name="chevron_right" className="aw-card-chev" />
              </div>
            ) : null}
            {source('genres://') ? (
              <div className="aw-card" onClick={() => fetch(source('genres://'))}>
                <div className="aw-tile aw-tile--icon aw-tile--lines" aria-hidden="true"><i /><i /><i /><Icon name="graphic_eq" className="aw-tile__glyph" /></div>
                <div className="aw-card-body"><div className="aw-card-title">Genres</div>{home.counts.genres !== undefined ? <div className="aw-card-sub">{home.counts.genres} genres</div> : null}</div>
                <Icon name="chevron_right" className="aw-card-chev" />
              </div>
            ) : null}
            {source('Last_100') ? (
              <div className="aw-card" onClick={() => fetch(source('Last_100'))}>
                <div className="aw-tile aw-tile--icon"><Icon name="history" /></div>
                <div className="aw-card-body"><div className="aw-card-title">Last 100</div><div className="aw-card-sub">Recently played</div></div>
                <Icon name="chevron_right" className="aw-card-chev" />
              </div>
            ) : null}
          </div>

          <div className="aw-sources-head">
            <span className="mono">SOURCES</span>
            <a className="aw-sources-manage" onClick={() => nav(SOURCES_SETTINGS)}>Manage</a>
          </div>
          <div className="aw-sources">
            {(['music-library', 'radio', 'upnp'] as const).map(u => { const src = source(u); if (!src) { return null; } const glyph = u === 'music-library' ? 'folder_open' : u === 'radio' ? 'radio' : 'dns'; return (
              <div key={u} className="aw-source" onClick={() => fetch(src)}>
                <Icon name={glyph} /><div className="aw-source-body"><div className="aw-source-name">{src.name}</div></div><Icon name="chevron_right" className="aw-source-chev" />
              </div>); })}
            {streaming.map(x => (
              <div key={x.uri} className="aw-source" onClick={() => fetch(x)}>
                {x.albumart && !logoFail[x.uri]
                  ? <span className="aw-source-logo"><img className={x.plugin_name === 'spop' ? 'aw-source-logo__img--pad' : 'aw-source-logo__img'} src={albumart(x.albumart)} alt="" onError={() => setLogoFail(f => ({ ...f, [x.uri]: true }))} /></span>
                  : <Icon name="cloud" />}
                <div className="aw-source-body"><div className="aw-source-name">{x.name}</div></div><Icon name="chevron_right" className="aw-source-chev" />
              </div>
            ))}
            <div className="aw-source aw-source--add" onClick={() => nav(SOURCES_SETTINGS)}>
              <Icon name="add" /><div className="aw-source-body"><div className="aw-source-name">Add a source</div><div className="aw-source-sub">Settings · Sources</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
