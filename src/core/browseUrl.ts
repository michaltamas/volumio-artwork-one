/**
 * The library's place in the address bar. The browse store holds the page; this keeps the URL in
 * step with it (`/browse?uri=…`, `/browse?q=…` for the landing's search, `/search?q=…` for the
 * search page) and the store in step with the URL when the browser moves on its own: Back and
 * Forward rewind or refetch, a reload opens the page the address names. Every opened page is one
 * history entry, so the browser's Back walks the trail instead of leaving the site.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useBrowse, type BrowseItem } from './store/browse';

// what a page needs to be asked for again after a reload: the item, without its lists
const KEEP = ['uri', 'name', 'title', 'service', 'type', 'plugin_name', 'plugin_type', 'albumart', 'artist', 'album'] as const;
export function slimItem(item: BrowseItem | null | undefined): Partial<BrowseItem> | null {
  if (!item || !item.uri) { return null; }
  const out: any = {};
  KEEP.forEach(k => { if ((item as any)[k] !== undefined && (item as any)[k] !== null && (item as any)[k] !== '') { out[k] = (item as any)[k]; } });
  return out;
}

// the library's own roots: a page reached by its address alone (a reload, a pasted link) still gets its name
const ROOTS: Record<string, string> = { 'albums://': 'Albums', 'artists://': 'Artists', 'genres://': 'Genres', 'playlists': 'Playlists', 'favourites': 'Favourites', 'Last_100': 'Last 100', 'music-library': 'Music Library', 'radio': 'Web Radio' };
/** a page's name from its uri when nothing else carries one: a source's own name, a library root, else the uri's last segment */
export function titleFor(uri: string, sources: BrowseItem[]): string {
  const known = knownTitle(uri, sources);
  if (known) { return known; }
  const last = String(uri || '').replace(/[/:]+$/, '').split(/[/:]/).pop() || '';
  try { return decodeURIComponent(last); } catch { return last; }
}
// a name that is certain: a root's or a source's (the sources may not be in yet when a page is asked for)
function knownTitle(uri: string, sources: BrowseItem[]): string {
  const u = String(uri || '');
  if (!u) { return ''; }
  if (ROOTS[u]) { return ROOTS[u]; }
  const src = (sources || []).find(s => s && s.uri && String(s.uri) === u);
  return src ? String(src.name || src.title || '') : '';
}

/** the address of a library page: where `open(item)` followed by `nav(browseUrl(item))` lands */
export function browseUrl(item: BrowseItem | null | undefined): string {
  const uri = item && item.uri ? String(item.uri) : '';
  return uri && uri !== '/' ? '/browse?uri=' + encodeURIComponent(uri) : '/browse';
}

function wantedUrl(dedicated: boolean): string {
  const st = useBrowse.getState();
  const q = st.isSearching && !st.isBrowsing ? st.searchField : '';
  if (dedicated && !st.isBrowsing) { return '/search' + (q ? '?q=' + encodeURIComponent(q) : ''); }
  const uri = st.isBrowsing ? st.currentUri : '';
  if (uri) { return '/browse?uri=' + encodeURIComponent(uri); }
  return '/browse' + (q ? '?q=' + encodeURIComponent(q) : '');
}

/** the in-app Back (the head's arrow, Backspace): the browser's own Back when the previous entry is ours, else the trail's */
export function browseBack(): void {
  const idx = Number((window.history.state && window.history.state.idx) || 0);
  if (idx > 0 && useBrowse.getState().trail.length > 1) { window.history.back(); return; }
  useBrowse.getState().goBack();
}

export function useBrowseUrl(dedicated: boolean): void {
  const loc = useLocation();
  const navType = useNavigationType();
  const nav = useNavigate();
  const uri = useBrowse(s => (s.isBrowsing ? s.currentUri : ''));
  const q = useBrowse(s => (s.isSearching && !s.isBrowsing ? s.searchField : ''));
  const first = useRef(true);
  const lastQ = useRef('');

  // the URL → the store: on arrival and whenever the browser itself moved (Back, Forward, a reload)
  useEffect(() => {
    const st = useBrowse.getState();
    const p = new URLSearchParams(loc.search);
    const wantUri = p.get('uri') || '';
    const wantQ = p.get('q') || '';
    const haveUri = st.isBrowsing ? st.currentUri : '';
    const haveQ = st.isSearching && !st.isBrowsing ? st.searchField : '';
    if (navType !== 'POP' && !first.current) { return; }   // our own push or replace: the store led, nothing to follow
    if (first.current && !wantUri && !wantQ) { return; }   // arrived at a bare address (the rail's `open` + `nav('/browse')`): the store leads, the URL follows
    if (wantUri !== haveUri) {
      if (!wantUri) { st.backHome(); }
      else {
        const at = st.trail.findIndex(t => String(t.uri || '') === wantUri);
        if (at > -1) { st.goTo(at); }
        else {
          const state = (loc.state && typeof loc.state === 'object') ? loc.state as Partial<BrowseItem> : {};
          // a name only when certain; otherwise the page names itself at render time (titleFor), once the sources are in
          const title = state.title || state.name || knownTitle(wantUri, st.sources) || undefined;
          st.fetch({ uri: wantUri, ...state, title, name: state.name || title } as BrowseItem, true);
        }
      }
    }
    if (!wantUri && wantQ !== haveQ) { if (wantQ) { st.search(wantQ); } else { st.clearSearch(); } }
  }, [loc.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // the store → the URL: a page opened or left, a search typed
  useEffect(() => {
    const want = wantedUrl(dedicated);
    const have = loc.pathname + loc.search;
    const wasFirst = first.current; first.current = false;
    const typing = !uri && lastQ.current !== '';   // one entry for a search, however long it is typed or cleared again
    lastQ.current = q;
    if (want === have) { return; }
    // the first sync replaces: the page was reached by `nav('/browse')` from outside, its entry
    // takes the address rather than a second one
    nav(want, { replace: wasFirst || typing, state: slimItem(useBrowse.getState().request) });
  }, [uri, q, dedicated]); // eslint-disable-line react-hooks/exhaustive-deps
}
