/**
 * A title cut short with an ellipsis slides across once, so the whole of it can be read: under the
 * mouse for the row or tile it sits in, and on a touch screen after a long press on the text itself
 * (a tap still opens or plays, as before). Works on any `.truncate-text`, tile label and the mini
 * player's lines — anything overflowing with `text-overflow: ellipsis`; nothing to wire per screen.
 */
const SEL = '.truncate-text, .music-card__label, .music-card__meta, #trackInfo-title, #trackInfo-artist-album, .aw-listhead__title, .np-empty__name, .np-empty__by';
const SPEED = 60;   // px per second

let running: HTMLElement | null = null;
let timer = 0;

function overflowing(e: HTMLElement) { return e.scrollWidth - e.clientWidth > 2 && getComputedStyle(e).textOverflow === 'ellipsis'; }

function stop() {
  window.clearTimeout(timer);
  if (running) { const r = running; running = null; r.classList.remove('aw-marquee'); const inner = r.querySelector(':scope > .aw-marquee__run') as HTMLElement | null; if (inner) { r.textContent = inner.dataset.text || inner.textContent; } }
}
function run(e: HTMLElement) {
  if (running === e) { return; }
  stop();
  if (!overflowing(e)) { return; }
  const text = e.textContent || ''; const far = e.scrollWidth - e.clientWidth;
  running = e; e.classList.add('aw-marquee');
  const inner = document.createElement('span'); inner.className = 'aw-marquee__run'; inner.dataset.text = text; inner.textContent = text;
  e.textContent = ''; e.appendChild(inner);
  const secs = far / SPEED + 0.6;
  inner.style.transition = `transform ${secs}s linear 0.4s`;
  requestAnimationFrame(() => { inner.style.transform = `translateX(${-far - 8}px)`; });
  // at the end, a pause, then back to the start (the ellipsis again)
  timer = window.setTimeout(stop, (secs + 1.6) * 1000);
}
const target = (t: EventTarget | null): HTMLElement | null => {
  const el = (t as Element | null)?.closest?.(SEL) as HTMLElement | null;
  if (el) { return el; }
  // over a row or a tile: its title line
  const host = (t as Element | null)?.closest?.('.music-item, .music-card, #trackInfo-compact') as HTMLElement | null;
  return host ? (host.querySelector(SEL) as HTMLElement | null) : null;
};

document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') { return; } const el = target(e.target); if (el) { run(el); } });
document.addEventListener('pointerout', (e) => { if (e.pointerType !== 'mouse' || !running) { return; } const to = e.relatedTarget as Element | null; const host = running.closest('.music-item, .music-card, #trackInfo-compact') || running; if (!to || !host.contains(to)) { stop(); } });
let press = 0;
document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { return; } window.clearTimeout(press); const el = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null; if (el && overflowing(el)) { press = window.setTimeout(() => run(el), 450); } });
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, (e) => { if ((e as PointerEvent).pointerType !== 'mouse') { window.clearTimeout(press); } }, { capture: true }));
document.addEventListener('scroll', stop, { passive: true, capture: true });
