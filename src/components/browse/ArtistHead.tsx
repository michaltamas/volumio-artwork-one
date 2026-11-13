/**
 * The artist page (mockup "Artist detail"): back + breadcrumb + local search, round portrait,
 * name + real counts, actions; an albums grid built from the artist's own lists (year and
 * track count from the tracks that name the album); the TRACKS head over Volumio's rows.
 */
import { useMemo, useState } from 'react';
import Icon from '../Icon';
import PageHead from '../PageHead';
import Dropdown from '../Dropdown';
import Crumbs from './Crumbs';
import ItemMenu from './ItemMenu';
import { useCrumbs, goCrumb } from './AlbumHead';
import { albumart } from '../../core/api';
import { useBrowse, type BrowseItem, type BrowseList } from '../../core/store/browse';
import * as A from '../../core/browseActions';

export const norm = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// the artist's lists by kind, keyed on item types (never on the translated list titles)
export function artistLists(lists: BrowseList[] | null, kind: 'songs' | 'albums'): { l: BrowseList; i: number }[] {
  return (lists || []).map((l, i) => ({ l, i })).filter(({ l }) => {
    const items = l.items || []; const songs = items.filter(it => it.type === 'song').length;
    return kind === 'songs' ? (items.length && songs === items.length) : (items.length && songs === 0);
  });
}
export interface ArtistAlbum { item: BrowseItem; uri: string; listIndex: number; itemIndex: number; year: number | null; tracks: number; kind: 'album' | 'artist' }
// a service's artist page lists other artists too (Tidal's "Similar artists"): the uri says so (tidal:artist:…, spotify:artist:…).
// The library's own artist page names its albums artists://Artist/Album — a path with the album after the artist is an album
const isArtistItem = (it: BrowseItem) => {
  if (it.type === 'artist') { return true; }
  const u = String(it.uri || '').toLowerCase();
  if (/^artists:\/\//.test(u)) { return !/^artists:\/\/[^/]+\/./.test(u); }
  return /(^|[:/])artists?([:@]|$)/.test(u) && !/album/.test(u);
};
export function artistAlbums(lists: BrowseList[] | null): ArtistAlbum[] {
  const tracks = ([] as BrowseItem[]).concat(...artistLists(lists, 'songs').map(({ l }) => l.items || []));
  const byAlbum: Record<string, { tracks: number; year: number | null }> = {};
  tracks.forEach(t => {
    const k = norm(t.album); if (!k) { return; }
    const e = byAlbum[k] || (byAlbum[k] = { tracks: 0, year: null });
    e.tracks++;
    const y = parseInt(String(t.year || '').slice(0, 4), 10);
    if (y && (!e.year || y < e.year)) { e.year = y; }
  });
  const out: ArtistAlbum[] = [];
  artistLists(lists, 'albums').forEach(({ l, i }) => (l.items || []).forEach((item, j) => {
    const e = byAlbum[norm(item.title)] || {} as any;
    out.push({ item, uri: item.uri || (i + ':' + j), listIndex: i, itemIndex: j, year: e.year || null, tracks: e.tracks || 0, kind: isArtistItem(item) ? 'artist' : 'album' });
  }));
  return out;
}

export default function ArtistHead({ filter, onFilter, showAll, onShowAll, newest, onToggleOrder, visibleTracks, onMenuOpen }:
  { filter: string; onFilter: (v: string) => void; showAll: boolean; onShowAll: () => void; newest: boolean; onToggleOrder: () => void; visibleTracks: number; onMenuOpen?: (key: string, open: boolean) => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);   // the album tile whose menu is open is raised over its later siblings
  const info = useBrowse(s => s.info) || {};
  const lists = useBrowse(s => s.lists);
  const crumbs = useCrumbs();
  const everything = useMemo(() => artistAlbums(lists), [lists]);
  const albums = useMemo(() => everything.filter(a => a.kind === 'album'), [everything]);
  const similar = useMemo(() => everything.filter(a => a.kind === 'artist'), [everything]);
  // a service's page keeps its own groups (Albums, EPs & singles): the first is ALBUMS, the others carry the list's name
  const groups = useMemo(() => { const seen: number[] = []; albums.forEach(a => { if (seen.indexOf(a.listIndex) < 0) { seen.push(a.listIndex); } }); return seen; }, [albums]);
  // the artist's picture: a size the service does not serve (Tidal's artists have no 640) is asked for once more at 750, then a glyph stands in
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgTried, setImgTried] = useState(false);
  const picture = imgSrc === null ? albumart(info.albumart) : imgSrc;
  const onImgError = () => { if (!imgTried && /\/640x640\./.test(picture)) { setImgTried(true); setImgSrc(picture.replace('/640x640.', '/750x750.')); } else { setImgSrc(''); } };
  const trackCount = useMemo(() => artistLists(lists, 'songs').reduce((n, { l }) => n + (l.items || []).length, 0), [lists]);
  const hasYears = albums.some(a => a.year);
  const sorted = useMemo(() => {
    if (!hasYears) { return albums; }
    const dir = newest ? -1 : 1;
    return albums.slice().sort((a, b) => { if (!a.year && !b.year) { return 0; } if (!a.year) { return 1; } if (!b.year) { return -1; } return (a.year - b.year) * dir || 0; });
  }, [albums, hasYears, newest]);
  const q = norm(filter).trim();
  const b = useBrowse.getState();
  return (
    <div className="aw-artist">
      <PageHead variant="artist" back={() => b.goBack()} backLabel="Back"
        nav={<Crumbs trail={crumbs} current={info.title} onHome={() => b.backHome()} onCrumb={goCrumb} />}
        actions={<label className={'aw-filter aw-artist__filter' + (filter.length ? ' aw-filter--on' : '')}>
          <Icon name="search" />
          <input type="search" value={filter} onChange={(e) => onFilter(e.target.value)} placeholder="Search this artist" aria-label="Search this artist" spellCheck={false} />
        </label>} />

      <div className="aw-artist__hero">
        {picture ? <img className="aw-artist__img" src={picture} alt="" onError={onImgError} /> : <div className="aw-artist__img aw-artist__img--glyph" aria-hidden="true"><Icon name="person" /></div>}
        <div className="aw-artist__body">
          <div className="aw-artist__eyebrow mono">ARTIST</div>
          <h1 className="aw-artist__name">{info.title}</h1>
          {albums.length || trackCount ? (
            <div className="aw-artist__meta">
              {albums.length ? <span className="mono">{albums.length} albums</span> : null}
              {albums.length && trackCount ? <span className="aw-artist__dot" /> : null}
              {trackCount ? <span className="mono">{trackCount} tracks</span> : null}
            </div>
          ) : null}
        </div>
        <div className="aw-artist__actions">
          <button type="button" className="aw-artist__play" onClick={() => A.playItemsList(info as BrowseItem)}><Icon name="play_arrow" /><span>Play</span></button>
          <button type="button" className="aw-artist__shuffle" onClick={() => A.shufflePlay(info as BrowseItem)}><Icon name="shuffle" /><span>Shuffle</span></button>
          <button type="button" className="aw-artist__iconbtn" onClick={() => A.addToQueue(info as BrowseItem)} aria-label="Add to queue" title="Add to queue"><Icon name="queue_music" /></button>
          <Dropdown className="hamburgerMenu aw-artist__menu" toggleClass="aw-artist__iconbtn" toggle={<Icon name="more_horiz" />}
            entries={[{ icon: 'play_arrow', label: 'Play', onClick: () => A.playItemsList(info as BrowseItem) }, { icon: 'queue_music', label: 'Add to queue', onClick: () => A.addToQueue(info as BrowseItem) }]} />
        </div>
      </div>

      {groups.map((g, gi) => {
        const inGroup = sorted.filter(a => a.listIndex === g);
        const title = gi === 0 ? 'ALBUMS' : String((lists || [])[g]?.title || 'MORE').toUpperCase();
        return (
          <div key={g}>
            <div className="aw-artist__sechead">
              <span className="mono aw-artist__label">{title}</span>
              <span className="mono aw-artist__count">{inGroup.length}</span>
              {gi === 0 && hasYears ? <button type="button" className="aw-artist__link" onClick={onToggleOrder}>{newest ? 'Newest first' : 'Oldest first'}</button> : null}
            </div>
            <div className="aw-artist__albums">
              {inGroup.map(a => {
                const list = (lists || [])[a.listIndex]?.items || [];
                const hidden = !!q && norm(a.item.title).indexOf(q) === -1;
                return (
                  <div key={a.uri} className={'aw-artist-album' + (hidden ? ' aw-hidden' : '') + (openMenu === a.listIndex + ':' + a.itemIndex ? ' is-menu-open' : '')} onClick={() => A.clickListItem(a.item, list, a.itemIndex)}>
                    <div className="aw-artist-album__cover">
                      <img src={albumart(a.item.albumart)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                      <div className="aw-artist-album__overlay" aria-hidden="true" />
                      <div className="aw-artist-album__actions" onClick={(e) => e.stopPropagation()}>
                        <ItemMenu item={a.item} id={`hamburgerMenuBtn-${a.listIndex}-${a.itemIndex}`} toggleClass="ghost-btn action-btn aw-artist-album__more" glyph="more_horiz" onOpenChange={(o) => { setOpenMenu(o ? a.listIndex + ':' + a.itemIndex : null); if (onMenuOpen) { onMenuOpen(a.listIndex + ':' + a.itemIndex, o); } }} />
                      </div>
                      <button type="button" className="aw-artist-album__play" onClick={(e) => { e.stopPropagation(); A.playRendered(a.item, list, a.itemIndex); }} aria-label="Play"><Icon name="play_arrow" /></button>
                    </div>
                    <div className="aw-artist-album__title">{a.item.title}</div>
                    {a.year || a.tracks ? <div className="aw-artist-album__sub mono">{a.year ? <span>{a.year}</span> : null}{a.year && a.tracks ? <span> · </span> : null}{a.tracks ? <span>{a.tracks} tracks</span> : null}</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {similar.length ? (
        <>
          <div className="aw-artist__sechead">
            <span className="mono aw-artist__label">{String((lists || [])[similar[0].listIndex]?.title || 'SIMILAR ARTISTS').toUpperCase()}</span>
            <span className="mono aw-artist__count">{similar.length}</span>
          </div>
          <div className="aw-artist__albums aw-artist__similar">
            {similar.map(a => {
              const list = (lists || [])[a.listIndex]?.items || [];
              const hidden = !!q && norm(a.item.title).indexOf(q) === -1;
              return (
                <div key={a.uri} className={'aw-artist-album aw-artist-album--artist' + (hidden ? ' aw-hidden' : '')} onClick={() => A.clickListItem(a.item, list, a.itemIndex)}>
                  <div className="aw-artist-album__cover"><img src={albumart(a.item.albumart)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /></div>
                  <div className="aw-artist-album__title">{a.item.title}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {trackCount ? (
        <div className="aw-artist__sechead aw-artist__sechead--tracks">
          <span className="mono aw-artist__label">TRACKS</span>
          <span className="mono aw-artist__count">{filter ? visibleTracks + ' / ' : ''}{trackCount}</span>
          {trackCount > 5 && !filter ? <button type="button" className="aw-artist__link" onClick={onShowAll}>{showAll ? 'Show less' : 'See all ' + trackCount}</button> : null}
        </div>
      ) : null}
    </div>
  );
}
