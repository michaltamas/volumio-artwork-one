/**
 * The library: the sources, the page that is open (its lists and, for an album, artist or
 * playlist, its info), the trail walked to get there, and the search.
 *
 * `browseLibrary {uri}` answers with `pushBrowseLibrary`. The trail is Volumio's navigation
 * stack: every answered page is pushed with its lists, so Back shows the previous page again
 * without asking the player; revisiting a uri already on the trail rewinds to it.
 */
import { create } from 'zustand';
import { on, emit } from '../socket';
import { searchPlaylists } from '../playlistSearch';
import { rest } from '../api';

export interface BrowseItem {
  uri: string;
  service?: string;
  type?: string;
  title?: string;
  name?: string;
  artist?: string;
  album?: string;
  albumart?: string;
  icon?: string;
  duration?: number;
  tracknumber?: number;
  year?: string | number;
  genre?: string;
  samplerate?: string;
  bitdepth?: string;
  trackType?: string;
  plugin_name?: string;
  plugin_type?: string;
  favourite?: boolean;
  meta?: string;
  tagImage?: string;
  static?: boolean;
  [k: string]: any;
}
export interface BrowseList { title?: string; icon?: string; availableListViews?: string[]; items: BrowseItem[]; [k: string]: any }
export interface BrowseInfo { uri?: string; title?: string; service?: string; type?: string; albumart?: string; artist?: string; album?: string; year?: string | number; genre?: string; duration?: string | number; trackType?: string; [k: string]: any }
interface Trail extends BrowseItem { lists: BrowseList[]; info: BrowseInfo | null; prev: any }

// the same key (and JSON value) Volumio's localStorageService used, so a preference set in one build holds in the other; unset = list
const GRID_KEY = 'ls.showGridView';
const GRID_TRACKS_KEY = 'ls.showGridViewTracks';   // a list of tracks has its own choice: covers for albums and folders, rows for the songs inside one
function readGridTracks(): boolean { try { const v = localStorage.getItem(GRID_TRACKS_KEY); return v === null ? false : JSON.parse(v) === true; } catch { return false; } }   // rows by default
function readGrid(): boolean { try { const v = localStorage.getItem(GRID_KEY); return v === null ? true : JSON.parse(v) === true; } catch { return true; } }   // Grid by default (Artists, Albums — wherever the source offers it); List is a saved choice, not the fallback

interface BrowseStore {
  sources: BrowseItem[];
  lists: BrowseList[] | null;
  info: BrowseInfo | null;
  prev: any;
  request: BrowseItem | null;      // the item the open page was asked for
  currentUri: string;
  trail: Trail[];
  isBrowsing: boolean;
  isSearching: boolean;
  dedicatedSearch: boolean;
  loading: boolean;
  showGridView: boolean;
  showGridViewTracks: boolean;
  searchField: string;
  favourites: Record<string, boolean>;
  scroll: Record<string, number>;
  stamp: number;                   // bumps on every answered page, for the scroll restore
  fetch: (item: BrowseItem, back?: boolean) => void;
  refine: (uri: string) => void;
  open: (item: BrowseItem, fresh?: boolean) => void;
  goBack: () => void;
  backHome: () => void;
  home: () => void;
  refresh: () => void;
  setGridView: (on: boolean, tracks?: boolean) => void;
  isTrackList: (list: BrowseList) => boolean;
  gridFor: (list: BrowseList) => boolean;
  trackPage: () => boolean;
  search: (value: string) => void;
  clearSearch: () => void;
  setDedicated: (on: boolean) => void;
  loadFavourites: () => void;
  favouritesChanged: () => void;
  canShowGridView: (list: BrowseList) => boolean;
  showGridViewSelector: () => boolean;
}

const norm = (u: any) => String(u || '').replace(/^(music-library|mnt)\//, '');
export { norm as normUri };

// Last 100 keeps one file under two addresses — "music-library/USB/…" and "mnt/USB/…", depending on
// where it was started — so a track shows twice and both rows light up as playing. One row per file,
// where it was played last, with the music-library address (the one the library itself plays).
function oncePerFile(lists: BrowseList[]): BrowseList[] {
  return lists.map((l) => {
    const seen = new Map<string, BrowseItem>();
    const items: BrowseItem[] = [];
    (l.items || []).forEach((it) => {
      if (!it || !it.uri || it.type !== 'song') { items.push(it); return; }
      const key = (it.service || '') + '|' + norm(it.uri);
      const kept = seen.get(key);
      if (!kept) { const copy = { ...it }; seen.set(key, copy); items.push(copy); return; }
      if (/^music-library\//.test(String(it.uri)) && !/^music-library\//.test(String(kept.uri))) { kept.uri = it.uri; kept.albumart = it.albumart || kept.albumart; }
    });
    return { ...l, items };
  });
}

let searchTimer: number | null = null;
let pendingPlaylists: Promise<any> | null = null;   // the playlists' own matches, joined to the player's answer
let favTimer: number | null = null;

export const useBrowse = create<BrowseStore>((set, get) => ({
  sources: [],
  lists: null,
  info: null,
  prev: null,
  request: null,
  currentUri: '',
  trail: [],
  isBrowsing: false,
  isSearching: false,
  dedicatedSearch: false,
  loading: false,
  showGridView: readGrid(),
  showGridViewTracks: readGridTracks(),
  searchField: '',
  favourites: {},
  scroll: {},
  stamp: 0,
  fetch: (item, back) => {
    if (item.uri === '/') { get().backHome(); return; }
    if (item.uri === 'cd') { return; }
    const scroll = { ...get().scroll };
    if (!back) { delete scroll[item.uri]; }
    set({ request: item, currentUri: String(item.uri || ''), loading: true, isBrowsing: item.static ? get().isBrowsing : true, scroll });
    emit('browseLibrary', { uri: item.uri });
  },
  // a service's genre filter or sort order (Qobuz: New Releases): the same page asked for again under
  // another uri — it replaces the page on the trail, so Back does not step through every change
  refine: (uri) => { const cur = get().request; if (!uri || !cur) { return; } get().fetch({ ...cur, uri, refine: true } as BrowseItem); },
  open: (item, fresh) => { if (fresh) { set({ trail: [], isSearching: false, searchField: '' }); } get().fetch(item); },
  goBack: () => {
    const trail = get().trail;
    const depth = trail.length;
    if (depth > 1) {
      const to = trail[depth - 2];
      set({ lists: to.lists, info: to.info, prev: to.prev, request: to, currentUri: String(to.uri || ''), trail: trail.slice(0, -1), isBrowsing: true, isSearching: false, stamp: get().stamp + 1 });
    } else {
      get().backHome();
    }
  },
  backHome: () => set({ isBrowsing: false, isSearching: false, trail: [], info: null, lists: null, request: null, currentUri: '', searchField: '', prev: null, stamp: get().stamp + 1 }),
  home: () => get().backHome(),
  refresh: () => { const r = get().request; if (r) { set({ loading: true }); emit('browseLibrary', { uri: r.uri }); } },
  setGridView: (on, tracks) => {
    try { localStorage.setItem(tracks ? GRID_TRACKS_KEY : GRID_KEY, JSON.stringify(on)); } catch { /* private mode */ }
    set(tracks ? { showGridViewTracks: on } : { showGridView: on });
  },
  // the landing's pill and the search page: Volumio's global search, results render in place
  search: (value) => {
    set({ searchField: value });
    if (searchTimer) { window.clearTimeout(searchTimer); searchTimer = null; }
    if (value && value.length >= 2) {
      set({ isSearching: true });
      searchTimer = window.setTimeout(() => { pendingPlaylists = searchPlaylists(value).catch(() => null); emit('search', { type: 'any', value }); }, 600);
    } else if (!value) {
      get().clearSearch();
    }
  },
  clearSearch: () => {
    if (searchTimer) { window.clearTimeout(searchTimer); searchTimer = null; }
    set({ searchField: '', isSearching: false, lists: get().isBrowsing ? get().lists : null });
  },
  setDedicated: (on) => {
    if (on) { set({ dedicatedSearch: true, isSearching: true, isBrowsing: false, lists: [], info: null, request: null, trail: [] }); }
    else if (get().dedicatedSearch) { set({ dedicatedSearch: false, isSearching: false, lists: null, searchField: '' }); }
  },
  // Volumio does not flag library items: the Favourites list is read over REST and the rows are marked from it
  loadFavourites: () => {
    rest<any>('browse', { uri: 'favourites' }).then(j => {
      const lists = (j && j.navigation && j.navigation.lists) || [];
      const fav: Record<string, boolean> = {};
      lists.forEach((l: any) => (l.items || []).forEach((i: any) => { if (i.uri) { fav[norm(i.uri)] = true; } }));
      // the items themselves carry the flag too: the row menu reads it
      (get().lists || []).forEach(l => (l.items || []).forEach(i => { if (i && i.uri && i.type === 'song') { i.favourite = !!fav[norm(i.uri)]; } }));
      set({ favourites: fav });
    });
  },
  favouritesChanged: () => { if (favTimer) { window.clearTimeout(favTimer); } favTimer = window.setTimeout(() => { favTimer = null; get().loadFavourites(); }, 900); },
  canShowGridView: (list) => !!(list && list.availableListViews && list.availableListViews.indexOf('grid') > -1),
  // a list of songs only: the tracks inside an album or a folder
  isTrackList: (list) => { const it = (list && list.items) || []; return it.length > 0 && it.every(i => i && i.type === 'song'); },
  gridFor: (list) => get().canShowGridView(list) && (get().isTrackList(list) ? get().showGridViewTracks : get().showGridView),
  // the page offers a grid only for its tracks: the toggle then sets the tracks' choice
  trackPage: () => { const l = (get().lists || []).filter(x => get().canShowGridView(x)); return l.length > 0 && l.every(x => get().isTrackList(x)); },
  showGridViewSelector: () => { const l = get().lists || []; return l.some(x => get().canShowGridView(x)); },
}));

on('pushBrowseSources', (data: BrowseItem[]) => useBrowse.setState({ sources: Array.isArray(data) ? data : [] }));
on('pushBrowseLibrary', (data: any) => {
  if (!data || !data.navigation) { return; }
  const st = useBrowse.getState();
  const raw: BrowseList[] = data.navigation.lists || [];
  const lists: BrowseList[] = st.request && st.request.uri === 'Last_100' ? oncePerFile(raw) : raw;
  // a search's answer: the playlists' matches are added as one more list once they are in
  if (st.isSearching && !st.isBrowsing && pendingPlaylists) {
    const p = pendingPlaylists; pendingPlaylists = null;
    // placed after the library's own lists ("Found … Album / Track"), before the services
    p.then((pl) => { const cur = useBrowse.getState(); if (!pl || !cur.isSearching || cur.lists !== lists) { return; } let at = 0; while (at < lists.length && /^Found /.test(String(lists[at].title || ''))) { at++; } useBrowse.setState({ lists: [...lists.slice(0, at), pl, ...lists.slice(at)], stamp: cur.stamp + 1 }); });
  }
  const info = data.navigation.info || null;
  const patch: Partial<BrowseStore> = { lists, info, prev: data.navigation.prev || null, loading: false, stamp: st.stamp + 1 };
  const req = st.request;
  if (req && req.uri && st.isBrowsing) {
    // a page already on the trail (a breadcrumb, a loop back) is returned to, not stacked twice
    let trail = st.trail;
    const seen = trail.findIndex(s => s.uri && s.uri === req.uri);
    if (seen > -1) { trail = trail.slice(0, seen); }
    else if ((req as any).refine && trail.length) { trail = trail.slice(0, -1); }
    patch.trail = [...trail, { ...req, lists, info, prev: data.navigation.prev || null }];
  }
  useBrowse.setState(patch);
  st.loadFavourites();
});
emit('getBrowseSources');
