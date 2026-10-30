/**
 * A long list (Albums, Artists, Genres, a big folder or playlist) drawn a window at a time: only the rows on
 * screen and a few around them are in the page, two spacers keep its full height — the scrollbar, the restored
 * position and a jump to a letter behave as if every tile were there. Volumio sends a library's whole list in
 * one answer; with 3,000 albums the page held 160,000 elements and a scroll frame took half a second.
 * The columns and the row height are read from the page's own CSS (the grid's resolved columns, the first row
 * drawn), so the tiles look exactly as in a short list.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export const VIRTUAL_FROM = 150;   // shorter lists are drawn whole, as before
const OVERSCAN = 4;                // rows drawn above and below the screen

// the long list on the page: the alphabet rail asks it to scroll to the first title under a letter
let jumper: ((letter: string) => boolean) | null = null;
export const jumpVirtual = (letter: string) => (jumper ? jumper(letter) : false);

interface Props { className: string; grid: boolean; count: number; render: (i: number) => ReactNode; tail?: ReactNode; letterOf?: (i: number) => string }
interface Metrics { cols: number; row: number; gap: number }

// the nearest ancestor that scrolls (#browseTablesWrapper, or #browse-page on the two-column album page)
function scrollerOf(el: HTMLElement | null): HTMLElement | null {
  let p = el ? el.parentElement : null;
  while (p) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll') { return p; } p = p.parentElement; }
  return null;
}

export default function VirtualItems({ className, grid, count, render, tail, letterOf }: Props) {
  const box = useRef<HTMLDivElement>(null);
  // a first guess, measured after the first draw (in the same frame: the layout effect re-renders before paint)
  const [m, setM] = useState<Metrics>({ cols: grid ? 6 : 1, row: grid ? 260 : 64, gap: 0 });
  const [range, setRange] = useState<[number, number]>([0, grid ? 6 : 20]);
  const live = useRef({ m, count, letterOf }); live.current = { m, count, letterOf };

  // where the list's first row sits from the scroller's top edge (negative once scrolled past)
  const offset = (el: HTMLElement, sc: HTMLElement) => el.getBoundingClientRect().top - sc.getBoundingClientRect().top + (parseFloat(getComputedStyle(el).paddingTop) || 0);

  const update = () => {
    const el = box.current, sc = scrollerOf(el); if (!el || !sc) { return; }
    const { m: { cols, row, gap }, count: n } = live.current;
    const step = row + gap, rows = Math.ceil(n / cols), top = offset(el, sc);
    const from = Math.min(rows, Math.max(0, Math.floor(-top / step) - OVERSCAN));
    const to = Math.max(from, Math.min(rows, Math.ceil((sc.clientHeight - top) / step) + OVERSCAN));
    setRange(r => (r[0] === from && r[1] === to ? r : [from, to]));
  };
  // the columns the CSS resolved and the height of the rows drawn (the first and last row of a list carry extra padding: not those)
  const measure = () => {
    const el = box.current; if (!el) { return false; }
    const cs = getComputedStyle(el);
    const cols = grid ? Math.max(1, cs.gridTemplateColumns.split(' ').filter(Boolean).length) : 1;
    const gap = parseFloat(cs.rowGap) || 0;
    const cells = (Array.from(el.children) as HTMLElement[]).filter(c => !c.hasAttribute('data-aw-spacer') && !c.classList.contains('placeholder-wrapper'));
    const sample = grid ? cells.slice(0, cols) : cells.filter(c => c !== el.firstElementChild && c !== el.lastElementChild).slice(0, 3);
    const row = (sample.length ? sample : cells.slice(0, 1)).reduce((h, c) => Math.max(h, c.getBoundingClientRect().height), 0) || live.current.m.row;
    const cur = live.current.m;
    if (cols !== cur.cols || gap !== cur.gap || Math.abs(row - cur.row) > 0.25) { setM({ cols, row, gap }); return true; }
    return false;
  };

  useLayoutEffect(() => { if (!measure()) { update(); } });
  useLayoutEffect(() => {
    const sc = scrollerOf(box.current); if (!sc) { return; }
    const onScroll = () => update();
    const onResize = () => { if (!measure()) { update(); } };
    sc.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onResize); ro.observe(sc); if (box.current) { ro.observe(box.current); }
    return () => { sc.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const me = (letter: string) => {
      const { letterOf: of, count: n, m: { cols, row, gap } } = live.current;
      const el = box.current, sc = scrollerOf(el); if (!of || !el || !sc) { return false; }
      let i = 0; while (i < n && of(i) !== letter) { i++; }
      if (i >= n) { return false; }
      sc.scrollTo({ top: sc.scrollTop + offset(el, sc) + Math.floor(i / cols) * (row + gap), behavior: 'smooth' });
      return true;
    };
    jumper = me;
    return () => { if (jumper === me) { jumper = null; } };
  }, []);

  const rows = Math.ceil(count / m.cols), step = m.row + m.gap;
  const [from, to] = [Math.min(range[0], rows), Math.min(range[1], rows)];
  // a spacer is one more grid row (or flex item) with the gap after it: its height leaves that gap out
  const before = from > 0 ? from * step - m.gap : 0;
  const after = rows - to > 0 ? (rows - to) * step - m.gap : 0;
  const cells: ReactNode[] = [];
  for (let i = from * m.cols, last = Math.min(count, to * m.cols); i < last; i++) { cells.push(render(i)); }
  return (
    <div ref={box} className={className + ' aw-virtual'}>
      {before > 0 ? <div data-aw-spacer="" aria-hidden="true" style={{ gridColumn: '1 / -1', height: before }} /> : null}
      {cells}
      {after > 0 ? <div data-aw-spacer="" aria-hidden="true" style={{ gridColumn: '1 / -1', height: after }} /> : null}
      {to >= rows ? tail : null}
    </div>
  );
}
