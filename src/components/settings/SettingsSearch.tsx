/** The settings search (handoff 11a): one field; results are rows; opening one goes to the page and lights the section. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { useSettings, type SearchResult } from '../../core/store/settings';
import { itemClick } from './nav';

export default function SettingsSearch() {
  const nav = useNavigate();
  const indexing = useSettings(s => !!s.asking);
  const index = useSettings(s => s.searchIndex);
  const extra = useSettings(s => s.extraPages);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focus, setFocus] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const active = !!q.trim();
  const run = (v: string) => { setQ(v); useSettings.setState({ searchQuery: v }); setResults(useSettings.getState().searchSettings(v)); setFocus(0); if (v.trim()) { useSettings.getState().askMissing(); } };
  useEffect(() => { if (q.trim()) { setResults(useSettings.getState().searchSettings(q)); } }, [index, extra, indexing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k' && input.current) { e.preventDefault(); e.stopPropagation(); input.current.focus(); } };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); useSettings.setState({ searchQuery: '' }); };
  }, []);
  const clear = () => run('');
  const open = (r: SearchResult) => {
    itemClick(r.item, nav); clear();
    if (!r.section) { return; }
    const id = r.section, started = Date.now();
    const look = () => { const el = document.querySelector('#pluginWrapper [data-section-id="' + id.replace(/"/g, '') + '"]'); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('aw-flash'); window.setTimeout(() => el.classList.remove('aw-flash'), 600); return; } if (Date.now() - started < 4000) { window.setTimeout(look, 150); } };
    window.setTimeout(look, 300);
  };
  const key = (e: React.KeyboardEvent) => {
    if (!results.length) { return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(f => Math.min(results.length - 1, f + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(f => Math.max(0, f - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); open(results[focus]); }
    else if (e.key === 'Escape') { clear(); }
  };
  return (
    <div className={'aw-ssearch-host' + (active ? ' is-active' : '')}>
    <div className={'aw-ssearch' + (active ? ' is-active' : '')}>
      <label className="aw-ssearch__field">
        <Icon name="search" />
        <input ref={input} type="search" value={q} onChange={(e) => run(e.target.value)} onKeyDown={key} placeholder="Search settings" aria-label="Search settings" autoComplete="off" spellCheck={false} />
        {!active ? <span className="aw-ssearch__key mono">⌘K</span> : null}
        {active ? <button type="button" className="aw-ssearch__clear" onClick={clear} aria-label="Clear"><Icon name="close" /></button> : null}
      </label>
      {active ? (
        <div className="aw-ssearch__results">
          {results.length ? <div className="aw-ssearch__count mono">{results.length} RESULT{results.length === 1 ? '' : 'S'}</div> : null}
          {results.length ? (
            <div className="aw-ssearch__list" role="listbox">
              {results.map((r, i) => (
                <div key={r.key} className={'aw-ssearch__row' + (i === focus ? ' is-focus' : '')} onClick={() => open(r)} onMouseEnter={() => setFocus(i)} role="option" aria-selected={i === focus}>
                  <div className="aw-ssearch__text">
                    {r.eyebrow ? <div className="aw-ssearch__eyebrow mono">{r.eyebrow.toUpperCase()}</div> : null}
                    <div className="aw-ssearch__title">{r.title}</div>
                    {r.sub ? <div className="aw-ssearch__sub">{r.sub}</div> : null}
                  </div>
                  <Icon name="chevron_right" className="aw-ssearch__chev" />
                </div>
              ))}
            </div>
          ) : null}
          {indexing ? <div className="aw-ssearch__loading"><span className="aw-ssearch__spin" /><span className="mono">READING PLUGIN SECTIONS…</span></div> : null}
          {!results.length && !indexing ? <div className="aw-ssearch__none">Nothing in Settings matches “{q}”.</div> : null}
        </div>
      ) : null}
    </div>
    </div>
  );
}
