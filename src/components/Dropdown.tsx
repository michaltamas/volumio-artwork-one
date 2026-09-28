/**
 * A small menu hanging from a button, placed where it fits when it opens: toward the free
 * side, below the button when there is room above the mini player, else above it, never
 * under the sticky page head. Closes on a tap outside, on Escape, or after a choice.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const GAP = 6, EDGE = 8;

export interface MenuEntry { icon?: string; label: string; danger?: boolean; badge?: string | number; title?: string; onClick: () => void }

function place(root: HTMLElement) {
  const menu = root.querySelector<HTMLElement>('.dropdown-menu');
  const anchor = root.querySelector<HTMLElement>('.dropdown-toggle') || root;
  if (!menu || !menu.offsetParent) { return; }
  const s = menu.style;
  s.top = ''; s.left = ''; s.right = ''; s.bottom = ''; s.maxHeight = ''; s.overflowY = ''; s.margin = '';
  const a = anchor.getBoundingClientRect();
  const w = menu.offsetWidth, h = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let sc: HTMLElement | null = menu.parentElement;
  while (sc && sc !== document.body && !(/auto|scroll/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight)) { sc = sc.parentElement; }
  const scr = sc && sc !== document.body ? sc.getBoundingClientRect() : null;
  const foot = document.getElementById('footer-content');
  let ceiling = Math.max(EDGE, scr ? scr.top + EDGE : EDGE);
  const head = (sc && sc !== document.body ? sc : document).querySelector<HTMLElement>('.aw-head');
  if (head) { const hr = head.getBoundingClientRect(); if (hr.height && hr.bottom > ceiling) { ceiling = hr.bottom + EDGE; } }
  const floor = Math.min(vh, foot && !foot.classList.contains('is-hidden') ? foot.getBoundingClientRect().top : vh, scr ? scr.bottom : vh) - EDGE;
  let left = a.right - w;
  if (left < EDGE) { left = a.left; }
  if (left + w > vw - EDGE) { left = vw - EDGE - w; }
  if (left < EDGE) { left = EDGE; }
  const below = floor - (a.bottom + GAP), above = a.top - GAP - ceiling;
  let top: number, maxH = 0;
  if (h <= below) { top = a.bottom + GAP; }
  else if (h <= above) { top = a.top - GAP - h; }
  else if (below >= above) { top = a.bottom + GAP; maxH = below; }
  else { top = ceiling; maxH = above; }
  const op = menu.offsetParent as HTMLElement, o = op.getBoundingClientRect();
  s.margin = '0'; s.right = 'auto'; s.bottom = 'auto';
  s.left = Math.round(left - o.left - op.clientLeft + op.scrollLeft) + 'px';
  s.top = Math.round(top - o.top - op.clientTop + op.scrollTop) + 'px';
  if (maxH) { s.maxHeight = Math.round(maxH) + 'px'; s.overflowY = 'auto'; }
}

export default function Dropdown({ className, toggle, toggleClass, toggleId, entries, header, children, onOpenChange }: { className?: string; toggle: ReactNode; toggleClass?: string; toggleId?: string; entries?: MenuEntry[]; header?: ReactNode; children?: ReactNode; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (onOpenChange) { onOpenChange(open); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (open && root.current) { place(root.current); } }, [open]);
  useEffect(() => {
    if (!open) { return; }
    const away = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) { setOpen(false); } };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); } };
    document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div className={(className || 'hamburgerMenu') + ' dropdown' + (open ? ' open' : '')} ref={root} onClick={(e) => e.stopPropagation()}>
      <button type="button" id={toggleId} className={(toggleClass || 'ghost-btn action-btn') + ' dropdown-toggle'} onClick={() => setOpen(v => !v)} aria-haspopup="true" aria-expanded={open}>{toggle}</button>
      <ul className="dropdown-menu buttonsGroup" style={{ display: open ? 'block' : 'none' }}>
        {header}
        {children}
        {entries?.map((e, i) => e.label === '-' ? <li key={i} className="aw-menu__sep" /> : (
          <li key={i} className={e.danger ? 'aw-menu__danger' : ''} title={e.title} onClick={() => { setOpen(false); e.onClick(); }}>
            <a>{e.icon ? <span className="material-symbols-rounded">{e.icon}</span> : null}<span>{e.label}</span>{e.badge !== undefined ? <span className="aw-menu__badge mono">{e.badge}</span> : null}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
