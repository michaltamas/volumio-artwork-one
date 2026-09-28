/** The page's lists in #browse-page: a grid of tiles or a list of rows per source, filtered, ordered, marked. */
import type { BrowseList } from '../../core/store/browse';
import { useBrowse, normUri } from '../../core/store/browse';
import { usePlayer } from '../../core/store/player';
import MusicCard from './MusicCard';
import MusicRow from './MusicRow';
import { artistLists, norm } from './ArtistHead';

export interface ListsProps { lists: BrowseList[]; filter: string; sortDesc: boolean; isArtist: boolean; artistsPage: boolean; serviceSearch: boolean; activeMenu: string | null; onMenuOpen: (key: string, open: boolean) => void }

export default function BrowseLists({ lists, filter, sortDesc, isArtist, artistsPage, serviceSearch, activeMenu, onMenuOpen }: ListsProps) {
  const grid = useBrowse(s => s.showGridView);
  const canGrid = useBrowse(s => s.canShowGridView);
  const fav = useBrowse(s => s.favourites);
  const st = usePlayer(s => s.state);
  const playingUri = normUri(st && st.uri);
  const paused = (st && st.status) !== 'play';
  const q = serviceSearch ? '' : norm(filter).trim();
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
  return (
    <>
      {lists.map((list, li) => {
        const asGrid = grid && canGrid(list);
        const items = list.items || [];
        const cls = isArtist ? (albumsIdx.indexOf(li) > -1 ? ' aw-artist-albums' : songsIdx.indexOf(li) > -1 ? ' aw-artist-tracks' : '') : '';
        return (
          <div className={'main__source' + cls} key={li}>
            <h3 className={'main__source__title panel-title' + (!list.title ? ' hidden' : '')}>{list.title || ''}</h3>
            <div className={asGrid ? 'main__row' : 'main__list'}>
              {items.map((item, ii) => {
                const key = li + ':' + ii;
                const hidden = !!q && norm(item.title || item.name).indexOf(q) === -1;
                const order = rank ? rank[key] : undefined;
                const u = normUri(item.uri);
                const playing = !!playingUri && u === playingUri;
                return asGrid
                  ? <MusicCard key={key} item={item} list={items} listIndex={li} itemIndex={ii} hidden={hidden} order={order} artistCounts={artistsPage} onMenuOpen={(o) => onMenuOpen(key, o)} />
                  : <MusicRow key={key} item={item} list={items} listIndex={li} itemIndex={ii} hidden={hidden} order={order} playing={playing} paused={playing && paused} fav={!!fav[u]} active={activeMenu === key} onMenuOpen={(o) => onMenuOpen(key, o)} />;
              })}
              {asGrid ? Array.from({ length: 6 }, (_, i) => <div key={'p' + i} className="music-card__wrapper placeholder-wrapper" />) : null}
              {items.length === 0 ? <h3 className="text-center panel-title">No items</h3> : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
