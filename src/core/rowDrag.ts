/**
 * Drag to reorder a list by its whole rows (the queue, the menu's sources): the dragged row follows the
 * pointer, the rows it passes slide aside, and on release `onDrop(from, to)` gets the new place. A mouse
 * starts the drag once it moves a few pixels (a click still does what the row does); a finger holds the
 * row a moment first (a swipe still scrolls the list). The list is the row's parent; its rows are the
 * parent's children that match `rows`. While dragging, the row has `is-dragging` and the list `is-reordering`.
 */
import type React from 'react';

let lastDrag = 0;
/** a drag ended just now: the click it ends in should do nothing */
export const justDragged = () => Date.now() - lastDrag < 50;

export function rowDrag(e: React.PointerEvent<HTMLElement>, rowsSelector: string, onDrop: (from: number, to: number) => void): void {
  if (e.button || (e.target as HTMLElement).closest('button, input, select, a[href]')) { return; }
  const row = e.currentTarget; const list = row.parentElement;
  if (!list || list.children.length < 2) { return; }
  const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
  const startX = e.clientX, startY = e.clientY;
  let started = false, holdTimer = 0, lastY = startY;
  let rows: HTMLElement[] = [], rects: DOMRect[] = [], from = -1, to = -1;
  const place = (y: number) => {
    const dy = y - startY;
    const cy = rects[from].top + rects[from].height / 2 + dy;
    to = from;
    rects.forEach((rc, i) => { if (i < from && cy <= rc.top + rc.height / 2) { to = Math.min(to, i); } if (i > from && cy >= rc.top + rc.height / 2) { to = Math.max(to, i); } });
    rows.forEach((r, i) => {
      if (i === from) { r.style.transform = 'translateY(' + dy + 'px)'; return; }
      let shift = 0;
      if (from < to && i > from && i <= to) { shift = -rects[from].height; }
      if (from > to && i >= to && i < from) { shift = rects[from].height; }
      r.style.transform = shift ? 'translateY(' + shift + 'px)' : '';
    });
  };
  const begin = () => {
    rows = Array.from(list.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.matches(rowsSelector));
    from = rows.indexOf(row); if (from < 0) { return; }
    rects = rows.map(r => r.getBoundingClientRect()); to = from; started = true;
    row.classList.add('is-dragging'); list.classList.add('is-reordering');
    if (touch && navigator.vibrate) { try { navigator.vibrate(10); } catch { /* not on this device */ } }
    place(lastY);
  };
  // a finger is followed by its touch events: the first move after the hold is cancelled, so the list does not
  // scroll under the row (a pointer would be cancelled by the browser's own scroll before the drag could take it)
  const onTouch = (ev: TouchEvent) => {
    const t = ev.touches[0]; if (!t) { return; }
    lastY = t.clientY;
    if (started) { ev.preventDefault(); place(t.clientY); return; }
    if (Math.abs(t.clientY - startY) > 8 || Math.abs(t.clientX - startX) > 8) { end(); }   // moved before the hold: a scroll, not a drag
  };
  const move = (ev: PointerEvent) => {
    if (touch) { return; }
    lastY = ev.clientY;
    if (started) { place(ev.clientY); return; }
    if (Math.abs(ev.clientY - startY) > 5 || Math.abs(ev.clientX - startX) > 8) { begin(); }
  };
  const end = () => {
    window.clearTimeout(holdTimer);
    document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
    document.removeEventListener('touchmove', onTouch); document.removeEventListener('touchend', end); document.removeEventListener('touchcancel', end);
    if (!started) { return; }
    rows.forEach(r => { r.style.transform = ''; });
    row.classList.remove('is-dragging'); list.classList.remove('is-reordering');
    lastDrag = Date.now();
    if (to !== from) { onDrop(from, to); }
  };
  if (touch) {
    holdTimer = window.setTimeout(begin, 350);
    document.addEventListener('touchmove', onTouch, { passive: false }); document.addEventListener('touchend', end); document.addEventListener('touchcancel', end);
  } else {
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  }
}
