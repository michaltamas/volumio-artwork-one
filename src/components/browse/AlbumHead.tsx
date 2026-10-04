/** The album / playlist header: cover, title, artist, meta line, actions; the crumbs in the shared head. */
import Icon from '../Icon';
import PageHead from '../PageHead';
import Crumbs from './Crumbs';
import { albumart } from '../../core/api';
import { useBrowse, type BrowseItem } from '../../core/store/browse';
import * as A from '../../core/browseActions';
import { runtime } from '../../core/format';

// Spotify's own plugin reports info.type: 'album' for a playlist too (not a label — its own
// uri still says spotify:...:playlist:..., the one reliable signal it actually gives us)
export function isPlaylistInfo(info: { type?: string; uri?: string }): boolean {
  return info.type === 'playlist' || info.type === 'play-playlist' || /:playlist:/.test(info.uri || '');
}

export function useCrumbs(): BrowseItem[] {
  const trail = useBrowse(s => s.trail);
  // an album's own page is a leaf: never an ancestor; and the trail is cut to the last two steps
  const leaf = (s: BrowseItem) => /^albums:\/\/[^/]+\/.+/.test(String(s.uri || ''));
  return trail.slice(0, -1).filter(s => (s.title || s.name) && !leaf(s)).slice(-2);
}
export function goCrumb(item: BrowseItem): void {
  if (!item) { return; }
  useBrowse.getState().fetch({ uri: item.uri, title: item.title || item.name, name: item.name || item.title, service: item.service, type: item.type, plugin_name: item.plugin_name, plugin_type: item.plugin_type });
}

// the crumb bar, kept OUT of .aw-headwrap and rendered as its own sibling in Browse.tsx: nested
// inside the same box as the cover, its sticky containing block would end where that box does —
// a short hero on a long list — and it would stop sticking well before the list's end
export function AlbumPageHead({ filter, onFilter }: { filter?: string; onFilter?: (v: string) => void }) {
  const info = useBrowse(s => s.info) || {};
  const crumbs = useCrumbs();
  const title = info.title || info.album;
  const placeholder = 'Filter ' + (isPlaylistInfo(info as BrowseItem) ? 'playlist' : 'album');
  return (
    <PageHead variant="album" back={() => useBrowse.getState().goBack()}
      nav={<Crumbs trail={crumbs} current={title} onHome={() => useBrowse.getState().backHome()} onCrumb={goCrumb} />}
      actions={onFilter ? (
        <label className={'aw-filter' + (filter ? ' aw-filter--on' : '')}>
          <Icon name="search" />
          <input type="search" value={filter || ''} onChange={(e) => onFilter(e.target.value)} placeholder={placeholder} aria-label={placeholder} spellCheck={false} />
        </label>
      ) : undefined} />
  );
}

export default function AlbumHead() {
  const info = useBrowse(s => s.info) || {};
  const lists = useBrowse(s => s.lists);
  const isPlaylist = isPlaylistInfo(info as BrowseItem);
  // what the page lists: its songs and their total length ("10 TRACKS · 46 MIN" in place of the album's "46:34")
  const songs = (lists || []).flatMap(l => (l.items || []).filter(i => i && i.type === 'song'));
  const count = songs.length || (() => { try { return lists![0].items.length; } catch { return 0; } })();
  const total = runtime(songs.reduce((t, i) => t + (Number(i.duration) || 0), 0));
  const summary = [count ? count + (count === 1 ? ' TRACK' : ' TRACKS') : '', total].filter(Boolean).join(' · ');
  const title = info.title || info.album;
  const genre = info.genre ? String(info.genre).split(';').join(' · ') : '';
  return (
    <div className={'aw-albumhead' + (isPlaylist ? ' aw-albumhead--playlist' : '')}>
      <div className={'aw-albumhead__cover' + (String(info.albumart || '').indexOf('sourceicon') > -1 ? ' aw-albumhead__cover--icon' : '')}>
        {info.albumart ? <img src={albumart(info.albumart)} alt={info.album || ''} /> : null}
      </div>
      <div className="aw-albumhead__body">
        <h1 className="aw-albumhead__title">{title}</h1>
        {info.artist ? <div className="aw-albumhead__artist">{info.artist}</div> : null}
        <div className="aw-albumhead__meta mono">
          {info.year ? <span>{info.year}</span> : null}
          {info.year && genre ? <span> · </span> : null}
          {genre ? <span>{genre}</span> : null}
          {(info.year || genre) && info.trackType ? <span> · </span> : null}
          {info.trackType ? <span>{info.trackType}</span> : null}
          {summary ? <span>{(info.year || genre || info.trackType) ? ' · ' : ''}{summary}</span> : null}
        </div>
        <Actions info={info as BrowseItem} isPlaylist={isPlaylist} />
      </div>
    </div>
  );
}

// Volumio saves a whole collection into Favourites / a playlist only when it can list its songs
// itself (the library: albums, artists, genres, folders). For anything else it keeps the
// collection's uri under its first song's title — a Tidal playlist became one "Nicole Kidman"
// favourite that plays all 50 tracks and shifts every row after it — so those pages don't offer it.
const canCollect = (info: BrowseItem) => /^(albums|artists|genres):\/\/|^music-library\//.test(String(info.uri || ''));

function Actions({ info, isPlaylist }: { info: BrowseItem; isPlaylist: boolean }) {
  const collect = canCollect(info);
  return (
    <div className="aw-albumhead__actions">
      <button type="button" className="aw-btn aw-btn--primary" onClick={() => A.playItemsList(info)}><Icon name="play_arrow" /><span>{isPlaylist ? 'Play' : 'Play album'}</span></button>
      {collect ? <button type="button" className="aw-iconbtn" onClick={() => A.addToFavorites(info)} title="Favourite"><Icon name="favorite" /></button> : null}
      {collect ? <button type="button" className="aw-iconbtn" onClick={() => A.addToPlaylist(info)} title="Add to playlist"><Icon name="playlist_add" /></button> : null}
      <button type="button" className="aw-iconbtn" onClick={() => A.addToQueue(info)} title="Add to queue"><Icon name="queue_music" /></button>
    </div>
  );
}
