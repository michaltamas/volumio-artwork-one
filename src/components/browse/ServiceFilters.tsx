/**
 * What a music service offers to narrow or order a page, the way Volumio's own interfaces show it
 * (Qobuz: New Releases): the first list's `filter` — { name, items: [{ label, uri, active }] } —
 * and `availableSortings` — [{ label, asc?: { uri, active }, desc?: { uri, active } }]. A choice asks
 * the service for its uri; the service does the filtering and marks what is active.
 */
import Dropdown, { type MenuEntry } from '../Dropdown';
import Icon from '../Icon';
import { useBrowse } from '../../core/store/browse';

interface FilterItem { label: string; uri: string; active: boolean }
interface Sorting { label: string; asc?: string; desc?: string; active: 'asc' | 'desc' | null }

function readFilter(lists: any[]): { name: string; items: FilterItem[] } | null {
  for (const l of lists) {
    const f = l && l.filter;
    if (!f || !Array.isArray(f.items)) { continue; }
    const items = f.items.filter((i: any) => i && typeof i.label === 'string' && i.label && typeof i.uri === 'string' && i.uri)
      .map((i: any) => ({ label: i.label, uri: i.uri, active: i.active === true }));
    if (items.length) { return { name: typeof f.name === 'string' ? f.name : '', items }; }
  }
  return null;
}
function readSortings(lists: any[]): Sorting[] {
  for (const l of lists) {
    if (!l || !Array.isArray(l.availableSortings)) { continue; }
    return l.availableSortings.filter((s: any) => s && s.label && ((s.asc && s.asc.uri) || (s.desc && s.desc.uri)))
      .map((s: any) => ({ label: s.label, asc: s.asc && s.asc.uri, desc: s.desc && s.desc.uri, active: s.asc && s.asc.active === true ? 'asc' : s.desc && s.desc.active === true ? 'desc' : null }));
  }
  return [];
}

export function hasServiceSortings(lists: any[] | null): boolean { return readSortings(lists || []).length > 0; }

export default function ServiceFilters() {
  const lists = useBrowse(s => s.lists) || [];
  const refine = useBrowse(s => s.refine);
  const filter = readFilter(lists);
  const sortings = readSortings(lists);
  if (!filter && !sortings.length) { return null; }
  const chosen = filter ? filter.items.filter(i => i.active).map(i => i.label) : [];
  const filterEntries: MenuEntry[] = filter ? filter.items.map(i => ({ icon: i.active ? 'check_box' : 'check_box_outline_blank', label: i.label, onClick: () => refine(i.uri) })) : [];
  const current = sortings.find(s => s.active);
  // the active order flips direction on a second choice; another order starts ascending
  const sortEntries: MenuEntry[] = sortings.map(s => ({
    icon: s.active === 'asc' ? 'arrow_upward' : s.active === 'desc' ? 'arrow_downward' : undefined,
    label: s.label,
    onClick: () => refine((s.active === 'asc' ? s.desc || s.asc : s.active === 'desc' ? s.asc || s.desc : s.asc || s.desc) as string),
  }));
  return (
    <div className="aw-svcfilters">
      {filter ? (
        <Dropdown className="hamburgerMenu aw-svcfilter" toggleClass={'aw-sort' + (chosen.length ? ' aw-sort--on' : '')} entries={filterEntries}
          toggle={<><span className="aw-sort__k">{filter.name || 'Filter'}</span><span className="aw-sort__v">{chosen.length ? chosen.join(', ') : 'All'}</span><Icon name="expand_more" /></>} />
      ) : null}
      {sortings.length ? (
        <Dropdown className="hamburgerMenu aw-svcfilter" toggleClass="aw-sort" entries={sortEntries}
          toggle={<><span className="aw-sort__k">Sort</span><span className="aw-sort__v">{current ? current.label : '–'}</span><Icon name="expand_more" /></>} />
      ) : null}
    </div>
  );
}
