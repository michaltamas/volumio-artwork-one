/**
 * One tooltip for the whole interface, hung from any control with a `title`: it shows at once on
 * hover (the browser's own waits a second and never shows on touch), with a longer explanation for
 * the controls whose icon is not obvious — the way Nova explains its icons. On a touch screen a
 * long press shows it. The `title` itself is lifted off the element while the tip shows, so the
 * browser's own does not come up on top of it.
 */
import { useUi } from './store/ui';

// what a control does, by its title (never by an icon's name): the second line of the tip
const WHY: Record<string, string> = {
  'Shuffle': 'Plays the queue in random order',
  'Repeat': 'Repeats the queue, or one track',
  'Previous track': 'Back to the start, or to the previous track',
  'Next track': 'Plays the next track in the queue',
  'Queue': 'The tracks lined up to play next',
  'Zones & outputs': 'Where the music plays: other players, groups, this browser',
  'Add to favourites': 'Keeps this track in Favourites',
  'Add to playlist': 'Adds this track to one of your playlists',
  'Lyrics': 'The words, synced to the music when they are',
  'Sleep timer': 'Stops the music, or the player, after a set time',
  'Save queue as playlist': 'Keeps the queue as a playlist to play again',
  'Clear queue': 'Removes every track from the queue',
  'Menu': 'Home, library, playlists, zones, settings',
  'Expand menu': 'Shows the labels beside the icons',
  'Collapse menu': 'Icons only',
  'Updating library': 'Volumio is indexing your music',
  'Mute': 'Silences the player; the volume is kept',
  'Unmute': 'Back to the volume from before',
  'Grid': 'Covers in a grid',
  'List': 'Rows with details',
  'Sort order': 'A to Z, or Z to A',
  'More': 'Playlists, favourites, artist and album of this track',
  'Play album': 'Plays the whole album from the start',
};

let tip: HTMLDivElement | null = null;
let target: HTMLElement | null = null;
let showTimer = 0, pressTimer = 0, stayTimer = 0;

function el(): HTMLDivElement {
  if (tip) { return tip; }
  tip = document.createElement('div'); tip.className = 'aw-tip'; tip.setAttribute('role', 'tooltip'); tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);
  return tip;
}
function hide() {
  window.clearTimeout(showTimer); window.clearTimeout(pressTimer); window.clearTimeout(stayTimer);
  if (target) { const t = target; target = null; if (t.dataset.awTip !== undefined) { t.title = t.dataset.awTip; delete t.dataset.awTip; } }
  if (tip) { tip.classList.remove('is-on'); }
}
function show(t: HTMLElement, touch: boolean) {
  const title = t.title; if (!title) { return; }
  hide();
  target = t; t.dataset.awTip = title; t.title = '';   // the browser's own stays away
  const why = WHY[title];
  const d = el();
  d.innerHTML = '';
  const a = document.createElement('div'); a.className = 'aw-tip__title'; a.textContent = title; d.appendChild(a);
  if (why) { const b = document.createElement('div'); b.className = 'aw-tip__why'; b.textContent = why; d.appendChild(b); }
  d.classList.add('is-on');
  // placed above the control, kept inside the window; below it when there is no room above
  const r = t.getBoundingClientRect(); const w = d.offsetWidth, h = d.offsetHeight, vw = window.innerWidth;
  let x = r.left + r.width / 2 - w / 2; x = Math.max(8, Math.min(vw - w - 8, x));
  let y = r.top - h - 8; if (y < 8) { y = r.bottom + 8; }
  d.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  if (touch) { stayTimer = window.setTimeout(hide, 2500); }
}
const control = (e: Event): HTMLElement | null => { const t = (e.target as Element | null)?.closest?.('[title]') as HTMLElement | null; return t && t.title && !t.closest('input, textarea, select') ? t : null; };

document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') { return; }
  const t = control(e); if (!t || t === target) { if (!t) { hide(); } return; }
  window.clearTimeout(showTimer); showTimer = window.setTimeout(() => show(t, false), 350);
});
document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && target && !(e.relatedTarget instanceof Element && target.contains(e.relatedTarget))) { hide(); } });
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') { hide(); return; }
  const t = control(e); window.clearTimeout(pressTimer);
  if (t) { pressTimer = window.setTimeout(() => show(t, true), 500); }   // a long press, under the finger
});
// a finger lifted before the long press: no tip (and a tip from an earlier press goes); after one, it stays its 2.5 s
document.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') { return; } const shown = !!(target && tip && tip.classList.contains('is-on')); window.clearTimeout(pressTimer); if (!shown) { hide(); } }, { capture: true });
['pointercancel', 'scroll', 'wheel', 'keydown'].forEach(ev => document.addEventListener(ev, hide, { passive: true, capture: true }));
document.addEventListener('focusin', (e) => { const t = e.target as HTMLElement; if (t && t.title && t.matches(':focus-visible')) { show(t, false); } });
document.addEventListener('focusout', hide);
useUi.subscribe(hide);   // a sheet opening, a page changing: the tip has nothing under it any more
