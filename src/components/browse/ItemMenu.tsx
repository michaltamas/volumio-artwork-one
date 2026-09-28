/**
 * The row / tile context menu (mockup "Context menu"): a header with the item, then Volumio's
 * real actions with Material glyphs — the same conditions as the core browse-hamburger-menu.
 */
import Dropdown, { type MenuEntry } from '../Dropdown';
import Icon from '../Icon';
import { albumart } from '../../core/api';
import { useBrowse, type BrowseItem } from '../../core/store/browse';
import { useQueue } from '../../core/store/queue';
import { usePins } from '../../core/store/pins';
import { usePlaylists } from '../../core/store/playlists';
import * as A from '../../core/browseActions';

export function menuEntries(item: BrowseItem): MenuEntry[] {
  const b = useBrowse.getState();
  const req = b.request || ({} as BrowseItem);
  const q = useQueue.getState().queue.length;
  const pins = usePins.getState();
  const pl = usePlaylists.getState();
  const out: MenuEntry[] = [];
  const sep = () => out.push({ label: '-', onClick: () => {} });
  const playable = A.showPlayButton(item), queueable = A.showAddToQueueButton(item);
  if (playable) { out.push({ icon: 'play_arrow', label: 'Play now', title: 'Play', onClick: () => A.play(item) }); }
  if (queueable) {
    out.push({ icon: 'playlist_play', label: 'Play next', title: 'Play next', onClick: () => A.playNext(item) });
    out.push({ icon: 'queue_music', label: 'Play last', title: 'Add to queue', badge: q ? q : undefined, onClick: () => A.playLast(item) });
  }
  const t = item.type;
  const collect = A.showAddToPlaylist(item) || pins.canPin(item) || t === 'song' || t === 'folder-with-favourites' || t === 'webradio' || t === 'mywebradio' || t === 'playlist';
  if ((playable || queueable) && collect) { sep(); }
  if ((t === 'song' || t === 'folder-with-favourites') && req.uri !== 'favourites' && !item.favourite) { out.push({ icon: 'favorite', label: 'Add to Favorites', onClick: () => { pl.addToFavourites(item); b.favouritesChanged(); } }); }
  if (req.uri === 'favourites' || item.favourite) { out.push({ icon: 'heart_broken', label: 'Remove from Favorites', onClick: () => { pl.removeFromFavourites(item); b.favouritesChanged(); } }); }
  if (A.showAddToPlaylist(item)) { out.push({ icon: 'playlist_add', label: 'Add to Playlist…', onClick: () => A.addToPlaylist(item) }); }
  if (pins.canPin(item)) { out.push({ icon: 'push_pin', label: pins.isPinned(item) ? 'Unpin' : 'Pin to Home', title: 'Pin to Home', onClick: () => { if (pins.isPinned(item)) { pins.unpin(item); } else { pins.pin(item); } } }); }
  if (req.type === 'playlist') { out.push({ icon: 'playlist_remove', label: 'Remove from Playlist', onClick: () => pl.removeFromPlaylist(item, req.title || '') }); }
  if (t === 'playlist') { out.push({ icon: 'delete', label: 'Delete Playlist', danger: true, onClick: () => pl.deletePlaylist(item.title || '') }); }
  if (t === 'remdisk') { out.push({ icon: 'eject', label: 'Safe Remove Media', onClick: () => A.safeRemoveDrive(item.title || '') }); }
  if ((t === 'folder' && String(item.uri).indexOf('music-library/') === 0) || t === 'internal-folder') { out.push({ icon: 'sync', label: 'Update Folder', onClick: () => A.updateFolder(item.uri) }); }
  if (t === 'internal-folder') { out.push({ icon: 'delete', label: 'Delete Folder', danger: true, onClick: () => A.deleteFolder(req.uri, item) }); }
  if (t === 'mywebradio-category') { out.push({ icon: 'add', label: 'Add Webradio', onClick: () => A.addWebRadio() }); }
  if (t === 'mywebradio') { out.push({ icon: 'edit', label: 'Edit Webradio', onClick: () => A.addWebRadio(item) }); }
  if (t === 'mywebradio' && req.uri === 'radio/myWebRadio') { out.push({ icon: 'delete', label: 'Delete Webradio', danger: true, onClick: () => pl.deleteWebRadio(item) }); }
  if (t === 'webradio' || t === 'mywebradio') { out.push({ icon: 'favorite', label: 'Add to Radio Favorites', onClick: () => pl.addToFavourites(item) }); }
  if (req.uri === 'radio/favourites' && (t === 'webradio' || t === 'mywebradio')) { out.push({ icon: 'heart_broken', label: 'Remove from Radio Favorites', onClick: () => pl.removeFromFavourites(item) }); }
  const goArtist = A.canGoToArtist(item), goAlbum = A.canGoToAlbum(item);
  if (goArtist || goAlbum) { sep(); }
  if (goAlbum) { out.push({ icon: 'album', label: 'Go to album', onClick: () => A.goToAlbum(item) }); }
  if (goArtist) { out.push({ icon: 'person', label: 'Go to artist', onClick: () => A.goToArtist(item) }); }
  if (playable) { sep(); out.push({ icon: 'playlist_remove', label: 'Clear and play', danger: true, onClick: () => A.replaceAndPlay(item) }); }
  return out;
}

export function MenuHead({ item }: { item: BrowseItem }) {
  if (!(item.title || item.name)) { return null; }
  const sub = !!(item.duration || item.trackType || item.samplerate);
  return (
    <li className="aw-menu__head">
      {item.albumart ? <img src={albumart(item.albumart)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : null}
      <div className="aw-menu__head-text">
        <div className="aw-menu__title">{item.title || item.name}</div>
        {sub ? (
          <div className="aw-menu__sub mono">
            {item.duration ? <span>{A.timeFormat(item.duration)}</span> : null}
            {item.duration && (item.samplerate || item.trackType) ? <span>&nbsp;·&nbsp;</span> : null}
            {item.samplerate ? <span>{item.samplerate}{item.bitdepth ? <span>/{item.bitdepth}</span> : null}</span> : null}
            {item.samplerate && item.trackType ? <span>&nbsp;</span> : null}
            {item.trackType ? <span>{String(item.trackType).toUpperCase()}</span> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

// the ⋯ button with its menu; the entries are built when it opens (queue length, pins, favourites change)
export default function ItemMenu({ item, id, toggleClass, glyph, onOpenChange }: { item: BrowseItem; id?: string; toggleClass?: string; glyph?: string; onOpenChange?: (open: boolean) => void }) {
  return (
    <Dropdown toggleId={id} toggleClass={toggleClass} toggle={<Icon name={glyph || 'more_vert'} />} header={<MenuHead item={item} />} entries={menuEntries(item)} onOpenChange={onOpenChange} />
  );
}
