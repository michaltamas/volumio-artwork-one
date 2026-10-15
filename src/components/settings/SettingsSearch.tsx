/**
 * The settings search (handoff 15E). The field sits at the top of the settings menu and works from
 * any section; on a wide screen its results take over the content area, and clearing the field
 * brings the section back as it was (it stays mounted underneath). The menu shows where the hits
 * are: a count beside each section with matches. Enter opens the focused result and flashes its row.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import Icon from '../Icon';
import { useSettings, type SearchResult } from '../../core/store/settings';
import { itemClick } from './nav';

/** the results for the open query, recomputed as the index fills */
export function useSearchResults(): SearchResult[] {
  const q = useSettings(s => s.searchQuery);
  const index = useSettings(s => s.searchIndex);
  const extra = useSettings(s => s.extraPages);
  return useMemo(() => useSettings.getState().searchSettings(q), [q, index, extra]);
}

/** open a result: its page, then the row (or the section) scrolled into view and flashed for 600 ms */
export function openResult(r: SearchResult, nav: NavigateFunction): void {
  itemClick(r.item, nav);
  useSettings.getState().setSearch('');
  if (!r.section) { return; }
  const sel = r.row ? '#pluginWrapper [data-row-id="' + r.row.replace(/"/g, '') + '"]' : '#pluginWrapper [data-section-id="' + r.section.replace(/"/g, '') + '"]';
  const started = Date.now();
  const look = () => {
    const el = document.querySelector(sel) || document.querySelector('#pluginWrapper [data-section-id="' + r.section!.replace(/"/g, '') + '"]');
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('aw-flash'); window.setTimeout(() => el.classList.remove('aw-flash'), 600); return; }
    if (Date.now() - started < 4000) { window.setTimeout(look, 150); }
  };
  window.setTimeout(look, 300);
}

export function SearchField({ className }: { className?: string }) {
  const nav = useNavigate();
  const q = useSettings(s => s.searchQuery);
  const results = useSearchResults();
  const input = useRef<HTMLInputElement>(null);
  const active = !!q.trim();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k' && input.current && input.current.offsetParent) { e.preventDefault(); e.stopPropagation(); input.current.focus(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  const key = (e: React.KeyboardEvent) => {
    const st = useSettings.getState();
    if (e.key === 'Escape') { st.setSearch(''); return; }
    if (!results.length) { return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); useSettings.setState({ searchFocus: Math.min(results.length - 1, st.searchFocus + 1) }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); useSettings.setState({ searchFocus: Math.max(0, st.searchFocus - 1) }); }
    else if (e.key === 'Enter') { e.preventDefault(); openResult(results[Math.min(st.searchFocus, results.length - 1)], nav); input.current?.blur(); }
  };
  return (
    <label className={'aw-sfield' + (active ? ' is-active' : '') + (className ? ' ' + className : '')}>
      <Icon name="search" />
      <input ref={input} type="search" value={q} onChange={(e) => useSettings.getState().setSearch(e.target.value)} onKeyDown={key} placeholder="Search" aria-label="Search settings" autoComplete="off" spellCheck={false} />
      {!active ? <span className="aw-sfield__key mono">⌘K</span> : <button type="button" className="aw-sfield__clear" onClick={() => useSettings.getState().setSearch('')} aria-label="Clear the search"><Icon name="close" /></button>}
    </label>
  );
}

export function SearchResults({ where }: { where?: string }) {
  const nav = useNavigate();
  const q = useSettings(s => s.searchQuery);
  const focus = useSettings(s => s.searchFocus);
  const indexing = useSettings(s => !!s.asking);
  const results = useSearchResults();
  if (!q.trim()) { return null; }
  return (
    <div className="aw-sres">
      <div className="aw-sres__head">
        <h2 className="aw-sres__title">Results</h2>
        <span className="aw-sres__count mono">{results.length} FOR “{q.trim().toUpperCase()}”</span>
      </div>
      {results.length ? (
        <div className="aw-sres__list" role="listbox" aria-label="Results">
          {results.map((r, i) => (
            <div key={r.key} className={'aw-sres__row' + (i === focus ? ' is-focus' : '')} onClick={() => openResult(r, nav)} onMouseEnter={() => useSettings.setState({ searchFocus: i })} role="option" aria-selected={i === focus}>
              <div className="aw-sres__text">
                {r.eyebrow ? <div className="aw-sres__eyebrow mono">{r.eyebrow.toUpperCase()}</div> : null}
                <div className="aw-sres__name">{r.title}</div>
                {r.sub ? <div className="aw-sres__sub">{r.sub}</div> : null}
              </div>
              <Icon name="chevron_right" className="aw-sres__chev" />
            </div>
          ))}
        </div>
      ) : null}
      {indexing ? <div className="aw-sres__loading"><span className="aw-sres__spin" /><span className="mono">READING PLUGIN SECTIONS…</span></div> : null}
      {!results.length && !indexing ? <div className="aw-sres__none">Nothing in Settings matches “{q.trim()}”.</div> : null}
      {results.length ? <p className="aw-sres__hint">Esc or the × clears the search{where ? ' and returns to ' + where + ', where you were' : ''}. Enter opens the focused result.</p> : null}
    </div>
  );
}
