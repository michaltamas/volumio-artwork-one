/** The page's lists in #browse-page: a grid of tiles or a list of rows per source, filtered, ordered, marked. */
import { useMemo, type ReactNode } from 'react';
import type { BrowseList, BrowseItem } from '../../core/store/browse';
import { useBrowse, normUri } from '../../core/store/browse';
import { usePlayer } from '../../core/store/player';
import MusicCard from './MusicCard';
import MusicRow from './MusicRow';
import { artistLists, norm } from './ArtistHead';
import VirtualItems, { VIRTUAL_FROM } from './VirtualItems';

export interface ListsProps { lists: BrowseList[]; filter: string; sortDesc: boolean; isArtist: boolean; artistsPage: boolean; serviceSearch: boolean; activeMenu: string | null; onMenuOpen: (key: string, open: boolean) => void; base?: number }

export default function BrowseLists({ lists, filter, sortDesc, isArtist, artistsPage, serviceSearch, activeMenu, onMenuOpen, base }: ListsProps) {
  const at = base || 0;   // the lists' place among the page's (the search page draws them shelf by shelf): keys and ids stay distinct
  const gridFor = useBrowse(s => s.gridFor);
  useBrowse(s => s.showGridView); useBrowse(s => s.showGridViewTracks);   // a change of either redraws
  const fav = useBrowse(s => s.favourites);
  const st = usePlayer(s => s.state);
  const playingUri = normUri(st && st.uri);
  const paused = (st && st.status) !== 'play';
  const q = serviceSearch ? '' : norm(filter).trim();
  // on an album's or a playlist's page every row carries the album's name: the filter looks at the titles and the artists only
  const onAlbumPage = useBrowse(s => !!s.info);
  const matches = (it: BrowseItem, q: string) => [it.title || it.name, it.artist, onAlbumPage ? '' : it.album].some(f => norm(f).indexOf(q) > -1);
  const albumsIdx = isArtist ? artistLists(lists, 'albums').map(x => x.i) : [];
  const songsIdx = isArtist ? artistLists(lists, 'songs').map(x => x.i) : [];
  // Z–A: rank every node on the page by its normalised title (the backend order is case-sensitive)
  let rank: Record<string, number> | null = null;
  if (sortDesc) {
    const all: { key: string; t: string }[] = [];
    lists.forEach((l, li) => { if (albumsIdx.indexOf(li) > -1) { return; } (l.items || []).forEach((it, ii) => all.push({ key: li + ':' + ii, t: norm(it.title || it.name) })); });
    all.sort((a, b) => b.t.localeCompare(a.t));
    rank = {}; all.forEach((x, i) => { rank![x.key] = i + 1; });
  }
  const cell = (li: number, ii: number, items: BrowseItem[], asGrid: boolean, hidden: boolean, order: number | undefined) => {
    const item = items[ii], key = (at + li) + ':' + ii;
    const u = normUri(item.uri);
    const playing = !!playingUri && u === playingUri;
    return asGrid
      ? <MusicCard key={key} item={item} list={items} listIndex={at + li} itemIndex={ii} hidden={hidden} order={order} artistCounts={artistsPage} onMenuOpen={(o) => onMenuOpen(key, o)} />
      : <MusicRow key={key} item={item} list={items} listIndex={at + li} itemIndex={ii} hidden={hidden} order={order} playing={playing} paused={playing && paused} fav={!!fav[u]} active={activeMenu === key} onMenuOpen={(o) => onMenuOpen(key, o)} />;
  };
  return (
    <>
      {lists.map((list, li) => {
        const asGrid = gridFor(list);
        const items = list.items || [];
        const cls = isArtist ? (albumsIdx.indexOf(li) > -1 ? ' aw-artist-albums' : songsIdx.indexOf(li) > -1 ? ' aw-artist-tracks' : '') : '';
        return (
          <div className={'main__source' + cls} key={at + li}>
            <h3 className={'main__source__title panel-title' + (!list.title ? ' hidden' : '')}>{list.title || ''}</h3>
            {!isArtist && items.length > VIRTUAL_FROM
              ? <LongList items={items} grid={asGrid} q={(list as any).awNoFilter ? '' : q} sortDesc={sortDesc} matches={matches} cell={(ii) => cell(li, ii, items, asGrid, false, undefined)} />
              : (
                <div className={asGrid ? 'main__row' : 'main__list'}>
                  {items.map((item, ii) => {
                    const key = li + ':' + ii;
                    const limit = (list as any).awLimit;   // the search page's shelves: the first few, the rest behind "Show all"
                    const hidden = (!!q && !(list as any).awNoFilter && !matches(item, q)) || (typeof limit === 'number' && ii >= limit);
                    return cell(li, ii, items, asGrid, hidden, rank ? rank[key] : undefined);
                  })}
                  {asGrid ? placeholders : null}
                  {items.length === 0 ? <h3 className="text-center panel-title">No items</h3> : null}
                </div>
              )}
          </div>
        );
      })}
    </>
  );
}

const placeholders = Array.from({ length: 6 }, (_, i) => <div key={'p' + i} className="music-card__wrapper placeholder-wrapper" />);
const titleOf = (it: BrowseItem) => norm(it.title || it.name);

/* a long list: filtered and ordered in the data (the tiles off screen are not in the page to hide or reorder), drawn a window at a time */
function LongList({ items, grid, q, sortDesc, matches, cell }: { items: BrowseItem[]; grid: boolean; q: string; sortDesc: boolean; matches: (it: BrowseItem, q: string) => boolean; cell: (ii: number) => ReactNode }) {
  const view = useMemo(() => {
    let v = items.map((_, i) => i);
    if (q) { v = v.filter(i => matches(items[i], q)); }
    if (sortDesc) { const t = v.map(i => titleOf(items[i])); v = v.map((i, k) => [i, k]).sort((a, b) => t[b[1]].localeCompare(t[a[1]])).map(x => x[0]); }
    return v;
  }, [items, q, sortDesc]); // eslint-disable-line react-hooks/exhaustive-deps
  return <VirtualItems className={grid ? 'main__row' : 'main__list'} grid={grid} count={view.length} render={(i) => cell(view[i])} tail={grid ? placeholders : null} letterOf={(i) => titleOf(items[view[i]]).charAt(0).toUpperCase()} />;
}
