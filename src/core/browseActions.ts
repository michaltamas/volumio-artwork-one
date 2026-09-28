/**
 * What the library's rows and tiles can do, and what a tap on them means: the same rules
 * Volumio's browse controller applies, keyed on item types and uris, never on labels.
 */
import { emit } from './socket';
import { useBrowse, type BrowseItem } from './store/browse';
import { useQueue } from './store/queue';
import { usePlayer } from './store/player';
import { usePlaylists } from './store/playlists';
import { useUndo } from './store/undo';
import { useModal } from './store/modal';

export function showHamburgerMenu(item: BrowseItem): boolean {
  const t = item.type;
  return !(t === 'radio-favourites' || t === 'radio-category' || t === 'spotify-category' || t === 'title' || t === 'streaming-category' || t === 'item-no-menu');
}
export function showPlayButton(item: BrowseItem | null | undefined): boolean {
  if (!item) { return false; }
  // play-all on a whole NAS or USB would freeze the player: no play on those roots
  if ((item.type === 'folder' && item.uri && item.uri.startsWith('music-library/') && item.uri.split('/').length < 4) || item.disablePlayButton === true) { return false; }
  const t = item.type;
  return t === 'folder' || t === 'song' || t === 'mywebradio' || t === 'webradio' || t === 'playlist' || t === 'cuesong' || t === 'remdisk' || t === 'cuefile' || t === 'folder-with-favourites' || t === 'internal-folder';
}
export function showAddToQueueButton(item: BrowseItem): boolean {
  const t = item.type;
  return t === 'folder' || t === 'song' || t === 'mywebradio' || t === 'webradio' || t === 'playlist' || t === 'remdisk' || t === 'cuefile' || t === 'folder-with-favourites' || t === 'internal-folder';
}
export function showAddToPlaylist(item: BrowseItem): boolean {
  const t = item.type;
  return t === 'folder' || t === 'song' || t === 'remdisk' || t === 'folder-with-favourites' || t === 'internal-folder';
}

export function timeFormat(time: number): string {
  const hrs = ~~(time / 3600), mins = ~~((time % 3600) / 60), secs = ~~time % 60;
  let ret = '';
  if (hrs > 0) { ret += hrs + ':' + (mins < 10 ? '0' : ''); }
  ret += mins + ':' + (secs < 10 ? '0' : '') + secs;
  return ret;
}

const req = () => useBrowse.getState().request || ({} as BrowseItem);

// --- play ---
export function playItemsList(item: BrowseItem, list?: BrowseItem[], index?: number): void {
  emit('playItemsList', { item, list, index });
}
export function play(item: BrowseItem): void {
  if (req().uri === 'playlists') { replaceAndPlay(item); } else { playItemsList(item); }
}
export function replaceAndPlay(item: BrowseItem): void {
  if (item.type === 'cuesong') { emit('replaceAndPlayCue', { uri: item.uri, number: item.number, service: item.service || null }); }
  else { emit('replaceAndPlay', { uri: item.uri, title: item.title, albumart: item.albumart || null, service: item.service || null }); }
}
export function addToQueue(item: BrowseItem): void {
  if (req().uri === 'playlists') { emit('enqueue', { name: item.title }); }
  else { emit('addToQueue', { uri: item.uri, title: item.title, albumart: item.albumart || null, service: item.service || null }); }
}
function queueItem(item: BrowseItem) {
  const out: any = { uri: item.uri, service: item.service, type: item.type };
  ['title', 'name', 'artist', 'album', 'albumart', 'duration', 'trackType', 'samplerate', 'bitdepth'].forEach(k => { if (item[k] !== undefined) { out[k] = item[k]; } });
  return out;
}
// takes the rows the action added back out: one for a track, everything the queue grew by for a
// folder or an album. A track already in the queue is moved by Play next, not added: nothing to take out.
function undoQueued(before: number, item: BrowseItem, slotOf: (q: any[]) => number): void {
  const q = useQueue.getState().queue || [];
  const grew = q.length - before;
  if (grew <= 0) { return; }
  const slot = slotOf(q);
  if (slot < 0 || slot >= q.length) { return; }
  if (grew === 1 && item.type === 'song') {
    const there = q[slot] && String(q[slot].name || q[slot].title || ''), want = String(item.title || item.name || '');
    if (there && want && there !== want) { return; }
  }
  const first = grew === 1 ? slot : Math.max(0, slot - grew + 1);
  for (let i = first + grew - 1; i >= first; i--) { useQueue.getState().remove(i); }
}
export function playNext(item: BrowseItem): void {
  const st: any = usePlayer.getState().state || {};
  const pos = typeof st.position === 'number' ? st.position : -1;
  const before = (useQueue.getState().queue || []).length;
  emit('playNext', queueItem(item));
  useUndo.getState().show({ icon: 'playlist_play', eyebrow: 'PLAYING NEXT', title: item.title || item.name || item.album || item.uri, swallow: true,
    undo: () => undoQueued(before, item, (q) => Math.min(q.length - 1, pos + 1)) });
}
export function playLast(item: BrowseItem): void {
  const before = (useQueue.getState().queue || []).length;
  addToQueue(item);
  useUndo.getState().show({ icon: 'queue_music', eyebrow: 'ADDED TO THE END', title: item.title || item.name || item.album || item.uri, swallow: true,
    undo: () => undoQueued(before, item, (q) => q.length - 1) });
}

// --- the library's own pages for a record's artist and album ---
export function canGoToArtist(item: BrowseItem): boolean { return !!(item && item.type === 'song' && item.service === 'mpd' && item.artist && !onArtistPage(item.artist)); }
export function canGoToAlbum(item: BrowseItem): boolean { return !!(item && item.type === 'song' && item.service === 'mpd' && item.artist && item.album && !onAlbumPage(item)); }
function onArtistPage(artist: string): boolean { const i = useBrowse.getState().info || {}; return i.type === 'artist' && (i.title === artist || i.artist === artist); }
function onAlbumPage(item: BrowseItem): boolean { const i = useBrowse.getState().info || {}; return i.type === 'album' && i.album === item.album && i.artist === item.artist; }
export function goToArtist(item: BrowseItem): void { useBrowse.getState().fetch({ uri: 'artists://' + encodeURIComponent(item.artist!), title: item.artist, name: item.artist, type: 'folder', service: 'mpd' }); }
export function goToAlbum(item: BrowseItem): void { useBrowse.getState().fetch({ uri: 'albums://' + encodeURIComponent(item.artist!) + '/' + encodeURIComponent(item.album!), title: item.album, name: item.album, type: 'folder', service: 'mpd' }); }

// --- a tap on a row / tile ---
export function clickListItem(item: BrowseItem, list?: BrowseItem[], index?: number): void {
  const t = item.type;
  if (t !== 'song' && t !== 'webradio' && t !== 'mywebradio' && t !== 'cuesong' && t !== 'album' && t !== 'artist' && t !== 'cd' && t !== 'play-playlist') { useBrowse.getState().fetch(item); }
  else if (t === 'webradio' || t === 'mywebradio' || t === 'album' || t === 'artist') { play(item); }
  else if (t === 'song') { playItemsList(item, list, index); }
  else if (t === 'cuesong') { emit('addPlayCue', { uri: item.uri, number: item.number, service: item.service || null }); }
  else if (t === 'cd') { replaceAndPlay(item); }
  else if (t === 'play-playlist') { emit('playPlaylist', { name: item.name }); }
}
// the tile's play button
export function playRendered(item: BrowseItem, list: BrowseItem[], index: number): void {
  if (item && item.type === 'song') { playItemsList(item, list, index); } else { playItemsList(item); }
}

// --- favourites / playlists / drives / folders / web radio ---
export function addToFavorites(item: BrowseItem): void {
  if (!item) { return; }
  if (item.favourite) { usePlaylists.getState().removeFromFavourites(item); } else { usePlaylists.getState().addToFavourites(item); }
  useBrowse.getState().favouritesChanged();
}
export function addToPlaylist(item: BrowseItem): void { usePlaylists.getState().refresh(); useModal.getState().open('playlist', { title: 'Add to playlist', item }); }
export function addWebRadio(item?: BrowseItem): void { useModal.getState().open('web-radio' as any, { title: 'Add web radio', item: item ? { ...item } : { title: '', uri: '' }, edit: !!item }); }
export function safeRemoveDrive(title: string): void { emit('safeRemoveDrive', title); }
export function updateFolder(uri: string): void { emit('updateDb', uri); }
export function deleteFolder(curUri: string, item: BrowseItem): void { emit('deleteFolder', { curUri, item }); }
// shuffle: play the item, with random on (Volumio has no per-item shuffle command)
export function shufflePlay(item: BrowseItem): void {
  playItemsList(item);
  window.setTimeout(() => { const st: any = usePlayer.getState().state; if (st && !st.random) { usePlayer.getState().shuffle(); } }, 600);
}

// Volumio's items carry a FontAwesome class for their glyph; the theme draws Material symbols
export function faIcon(icon?: string): string {
  const s = String(icon || '');
  if (/folder-open/.test(s)) { return 'folder_open'; }
  if (/folder/.test(s)) { return 'folder'; }
  if (/microphone/.test(s)) { return 'mic'; }
  if (/heart/.test(s)) { return 'favorite'; }
  if (/list-ol|list/.test(s)) { return 'queue_music'; }
  if (/hdd|server/.test(s)) { return 'storage'; }
  if (/usb/.test(s)) { return 'usb'; }
  if (/star/.test(s)) { return 'star'; }
  if (/sitemap|dns/.test(s)) { return 'dns'; }
  if (/globe/.test(s)) { return 'language'; }
  if (/cloud/.test(s)) { return 'cloud'; }
  if (/share/.test(s)) { return 'share'; }
  if (/file-audio|file/.test(s)) { return 'audio_file'; }
  if (/play/.test(s)) { return 'play_arrow'; }
  if (/radio|podcast|feed/.test(s)) { return 'radio'; }
  if (/history|clock/.test(s)) { return 'history'; }
  if (/tags?\b/.test(s)) { return 'sell'; }
  if (/user/.test(s)) { return 'person'; }
  return 'music_note';
}
