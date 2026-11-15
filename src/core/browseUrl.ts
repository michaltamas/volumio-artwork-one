/**
 * The library's place in the address bar. The browse store holds the page; this keeps the URL in
 * step with it (`/browse?uri=…`, `/browse?q=…` for the landing's search, `/search?q=…` for the
 * search page) and the store in step with the URL when the browser moves on its own: Back and
 * Forward rewind or refetch, a reload opens the page the address names. Every opened page is one
 * history entry, so the browser's Back walks the trail instead of leaving the site.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBrowse, type BrowseItem, type Trail } from './store/browse';

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

// What the router itself did last, told by the shell: inside `<Routes location>` every navigation
// reads as POP, so the pages below cannot ask the router.
let realNav = { key: '', type: 'POP' };
export function noteNav(key: string, type: string): void { realNav = { key, type }; }
// The addresses of this session's history entries by their index, as they were when shown: the
// browser does not tell what lies behind the current one.
const entries: Record<number, string> = {};
const histIdx = () => Number((window.history.state && window.history.state.idx) || 0);
export function noteEntry(): void {
  entries[histIdx()] = window.location.pathname + window.location.search;
  if (realNav.type !== 'POP') { delete trails[histIdx()]; }   // a new page on this index: what was kept for the one it replaced is not its trail
  keepTrail();
}
/** the address of the history entry before the current one, when it was seen in this session */
export function entryBefore(): string | undefined { const idx = histIdx(); return idx > 0 ? entries[idx - 1] : undefined; }

// The trail as it stood on each history entry. Back or Forward can land on a page that is no longer
// on the trail (a sibling opened from the rail, a page stepped back from): it comes back with the
// trail it had, rather than stacked on top of the page just left.
const trails: Record<number, Trail[]> = {};
const KEPT = 40;   // entries around the current one; the pages further away are asked for again
function keepTrail(): void {
  const st = useBrowse.getState();
  const t = st.trail;
  if (!st.isBrowsing || !t.length || window.location.pathname !== '/browse') { return; }
  // only once the address and the trail name the same page: one of the two is a step behind while a page opens
  if (String(t[t.length - 1].uri || '') !== (new URLSearchParams(window.location.search).get('uri') || '')) { return; }
  const idx = histIdx();
  trails[idx] = t;
  delete trails[idx - KEPT]; delete trails[idx + KEPT];
}
useBrowse.subscribe((s, old) => { if (s.trail !== old.trail) { keepTrail(); } });

/** the in-app Back (the head's arrow, Backspace): the browser's own Back when the entry before is the trail's previous page, else the trail's */
export function browseBack(): void {
  const trail = useBrowse.getState().trail;
  if (trail.length > 1 && entryBefore() === browseUrl(trail[trail.length - 2])) { window.history.back(); return; }
  useBrowse.getState().goBack();
}

export function useBrowseUrl(dedicated: boolean): void {
  const loc = useLocation();
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
    const popped = realNav.key !== loc.key || realNav.type === 'POP';   // the browser moved: Back, Forward, a reload
    if (!popped && !first.current) { return; }   // our own push or replace: the store led, nothing to follow
    if (!popped && !wantUri && !wantQ) { return; }   // arrived at a bare address by a link (the rail's `open` + `nav('/browse')`): the store leads, the URL follows
    if (wantUri !== haveUri) {
      if (!wantUri) { st.backHome(); }
      else {
        const kept = trails[histIdx()];
        const at = st.trail.findIndex(t => String(t.uri || '') === wantUri);
        if (popped && kept && String(kept[kept.length - 1].uri || '') === wantUri) { useBrowse.setState({ trail: kept }); st.goTo(kept.length - 1); }
        else if (at > -1) { st.goTo(at); }
        else {
          if (popped) { useBrowse.setState({ trail: [] }); }   // nothing known of the way there: the page stands alone, not on top of the one just left
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
    // the address as the browser has it: `loc` is a step behind while a navigation started in this
    // same tick (`open(item); nav(browseUrl(item))`) is still on its way
    const have = window.location.pathname + window.location.search;
    const wasFirst = first.current; first.current = false;
    const typing = !uri && lastQ.current !== '';   // one entry for a search, however long it is typed or cleared again
    lastQ.current = q;
    if (want === have) { return; }
    if (window.location.pathname !== loc.pathname) { return; }   // on its way to another page (the search page's Library tab, Now Playing over this one): that address is not ours to rewrite
    // a search cleared goes back to the entry it was typed on, rather than leaving a second bare one
    if (typing && !q && entryBefore() === want) { window.history.back(); return; }
    // the first sync replaces: the page was reached by `nav('/browse')` from outside, its entry
    // takes the address rather than a second one. A filter or a sort order replaces too: Back does
    // not step through every change of it.
    const request = useBrowse.getState().request;
    nav(want, { replace: wasFirst || typing || !!(request && (request as any).refine), state: slimItem(request) });
  }, [uri, q, dedicated]); // eslint-disable-line react-hooks/exhaustive-deps
}
