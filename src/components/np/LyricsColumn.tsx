/**
 * The words (handoff 6a, 6d): the column used in the desktop face and in the phone sheet.
 * In the phone's sheet the synced lines keep the current one at the optical centre: on a line
 * change the stack translates over 280 ms; a seek jumps without tweening.
 * On the desk (`free`, volumio-nowplaying.html) the text scrolls for real: the current line is
 * brought to the middle of whatever scrolls it — the column on a roomy screen, the stage on a
 * compact one — the listener may scroll away from it, and a button, or eight seconds left
 * alone, brings the text back.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLyrics } from '../../core/store/lyrics';
import type { LyricLine } from '../../core/store/lyrics';
import { usePlayer } from '../../core/store/player';

export function useLyricsIndex(): number {
  const state = useLyrics(s => s.state);
  const indexAt = useLyrics(s => s.indexAt);
  const elapsed = usePlayer(s => s.elapsedMs);
  const st: any = usePlayer(s => s.state);
  if (state !== 'synced') { return -1; }
  if (!st || st.status === 'stop') { return indexAt(0); }
  const duration = st.duration ? st.duration * 1000 : 0;
  const ms = duration ? Math.min(Math.max(0, elapsed), duration) : Math.max(0, elapsed);
  return indexAt(ms);
}

function lineClass(i: number, c: number): string {
  const d = i - c;
  if (d === 0) { return 'is-now'; }
  if (d < 0) { return d === -1 ? 'is-dim' : 'is-faint'; }
  return d === 1 ? 'is-muted' : (d === 2 ? 'is-dim' : 'is-faint');
}

// a tap on a line plays from it; false when the player cannot seek (a stream, another app driving it)
function seekToLine(l: LyricLine): boolean {
  const st: any = usePlayer.getState().state;
  if (!l || !st || !st.duration || st.disableUi) { return false; }
  usePlayer.getState().seekTo(l.t / 1000); return true;
}

function Stack({ lines, index, onPick }: { lines: LyricLine[]; index: number; onPick: (l: LyricLine, i: number) => void }) {
  return (
    <div className="np-lyrics__stack">
      {lines.map((l, i) => (
        <div key={i} className={'np-lyrics__line ' + lineClass(i, index)} data-line={i} onClick={() => onPick(l, i)} role="button" tabIndex={-1}>
          <span className="np-lyrics__mark" aria-hidden="true" /><span className="np-lyrics__text">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/** The phone's sheet: the stack moves under a fixed window, nothing scrolls. */
function PinnedLines() {
  const lines = useLyrics(s => s.lines);
  const index = useLyricsIndex();
  const col = useRef<HTMLDivElement>(null);
  const last = useRef(-2);
  const place = (i: number, tween: boolean) => {
    const c = col.current; const stack = c && (c.firstElementChild as HTMLElement | null);
    if (!c || !stack) { return; }
    const line = i >= 0 ? stack.querySelector<HTMLElement>(`[data-line="${i}"]`) : null;
    const target = line || stack.querySelector<HTMLElement>('[data-line="0"]');
    if (!target) { stack.style.transform = ''; return; }
    const offset = target.offsetTop + target.offsetHeight / 2 - c.clientHeight / 2;
    stack.classList.toggle('no-tween', !tween);
    stack.style.transform = `translateY(${-Math.max(0, offset)}px)`;
  };
  useLayoutEffect(() => {
    // a jump of more than one line, or backwards, is a seek: no tween
    const tween = last.current !== -2 && index - last.current === 1;
    last.current = index;
    const raf = requestAnimationFrame(() => place(index, tween));
    return () => cancelAnimationFrame(raf);
  }, [index, lines]);
  useEffect(() => {
    const c = col.current; if (!c || typeof ResizeObserver === 'undefined') { return; }
    const ro = new ResizeObserver(() => place(last.current, false)); ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div className="np-lyrics__eyebrow np-lyrics__eyebrow--synced mono">LYRICS · LRCLIB</div>
      <div className="np-lyrics__col np-lyrics__col--synced" ref={col}><Stack lines={lines} index={index} onPick={seekToLine} /></div>
    </>
  );
}

const IDLE_MS = 8000;   // left alone this long, the text returns to the current line
const EDGE = 24;        // this close to the scroller's edge the current line already counts as out of sight
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
const calm = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/** The desk: the text scrolls, follows the current line, and lets the listener read elsewhere. */
function FreeLines() {
  const lines = useLyrics(s => s.lines);
  const index = useLyricsIndex();
  const col = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const [dir, setDir] = useState<'' | 'up' | 'down'>('');   // where the current line went; '' while it is in sight or followed
  const f = useRef({ follow: true, cur: index, placed: false, held: false, idle: 0 }).current;
  // a roomy screen scrolls the column, a compact one the page (the stage); none while the desk's face is not shown (the phone)
  const scroller = (): HTMLElement | null => {
    const c = col.current; if (!c || !c.getClientRects().length) { return null; }
    return getComputedStyle(c).overflowY === 'auto' ? c : c.closest<HTMLElement>('#np-stage');
  };
  const lineEl = () => col.current && col.current.querySelector<HTMLElement>(`[data-line="${Math.max(0, f.cur)}"]`);   // before the first line: the first
  const toLine = (smooth: boolean) => {
    const sc = scroller(), line = lineEl(); if (!sc || !line) { return; }
    const r = line.getBoundingClientRect(), s = sc.getBoundingClientRect();
    sc.scrollBy({ top: r.top + r.height / 2 - (s.top + s.height / 2), behavior: smooth && !calm() ? 'smooth' : 'auto' });
    f.placed = true;
  };
  // the button shows only while the current line is out of sight; its arrow points to where the line is
  const update = () => {
    const sc = scroller(), line = lineEl();
    if (f.follow || !sc || !line) { setDir(''); return; }
    const r = line.getBoundingClientRect(), s = sc.getBoundingClientRect();
    setDir(r.bottom < s.top + EDGE ? 'up' : r.top > s.bottom - EDGE ? 'down' : '');
  };
  // the button goes away under the press; while it still holds the focus, the browser drops the scroll just begun in its own scroller
  const resume = () => { window.clearTimeout(f.idle); f.follow = true; if (back.current) { back.current.blur(); } setDir(''); toLine(true); };
  const pause = () => { if (!scroller()) { return; } f.follow = false; window.clearTimeout(f.idle); f.idle = window.setTimeout(resume, IDLE_MS); update(); };
  // a line change from the player: followed, or only the highlight and the button while the listener is away
  useLayoutEffect(() => {
    f.cur = index;
    if (!f.follow) { update(); return; }
    // the first time the column simply shows the line; the page travels to it from the cover
    const raf = requestAnimationFrame(() => { const sc = scroller(); toLine(f.placed || (!!sc && sc !== col.current)); });
    return () => cancelAnimationFrame(raf);
  }, [index, lines]);
  useEffect(() => {
    const c = col.current; if (!c) { return; }
    const stage = c.closest<HTMLElement>('#np-stage');
    const els = stage ? [c, stage] : [c];
    // only the listener's own input pauses following, never the scrolling done here
    const onInput = (e: Event) => { if (e.currentTarget === scroller()) { pause(); } };
    // the scrollbar taken by the pointer: no wheel, no touch, only scrolling while it is held
    const onDown = (e: PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      if (e.target !== el || el !== scroller() || e.clientX < el.getBoundingClientRect().left + el.clientLeft + el.clientWidth) { return; }
      f.held = true; pause();
    };
    const onScroll = (e: Event) => { if (f.held && e.currentTarget === scroller()) { pause(); } else if (!f.follow) { update(); } };
    const onUp = () => { f.held = false; };
    const onMove = (e: PointerEvent) => { if (f.held && !e.buttons) { f.held = false; } };   // the release over a scrollbar does not always arrive
    // an arrow the shortcuts took for the volume (core/shortcuts, registered before this) scrolls nothing
    const onKey = (e: KeyboardEvent) => { if (!e.defaultPrevented && SCROLL_KEYS.indexOf(e.key) >= 0) { pause(); } };
    els.forEach((el) => {
      el.addEventListener('wheel', onInput, { passive: true }); el.addEventListener('touchmove', onInput, { passive: true });
      el.addEventListener('pointerdown', onDown); el.addEventListener('scroll', onScroll, { passive: true });
    });
    window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp); window.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKey);
    // the window resized, the queue docked: the line back to the middle at once (the first report is the box as it was laid out)
    let first = true;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (first) { first = false; return; } if (f.follow) { toLine(false); } else { update(); } });
    if (ro) { ro.observe(c); }
    return () => {
      window.clearTimeout(f.idle);
      els.forEach((el) => {
        el.removeEventListener('wheel', onInput); el.removeEventListener('touchmove', onInput);
        el.removeEventListener('pointerdown', onDown); el.removeEventListener('scroll', onScroll);
      });
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
      if (ro) { ro.disconnect(); }
    };
  }, []);
  // the line the listener picked becomes the current one, and is followed again
  const pick = (l: LyricLine, i: number) => { if (seekToLine(l)) { f.cur = i; resume(); } };
  return (
    <>
      <div className="np-lyrics__eyebrow np-lyrics__eyebrow--synced mono">LYRICS · LRCLIB</div>
      <div className="np-lyrics__col np-lyrics__col--synced" ref={col}><Stack lines={lines} index={index} onPick={pick} /></div>
      <button type="button" className="np-lyrics__back" ref={back} hidden={!dir} data-dir={dir || undefined} onClick={resume}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>Back to current line
      </button>
    </>
  );
}

export default function LyricsColumn({ free = false }: { free?: boolean }) {
  const state = useLyrics(s => s.state);
  const plain = useLyrics(s => s.plain);
  return (
    <div className={'np-lyrics np-lyrics--' + state + (free ? ' np-lyrics--free' : '')}>
      {state === 'synced' ? (free ? <FreeLines /> : <PinnedLines />) : null}
      {state === 'plain' ? (
        <div className="np-lyrics__col np-lyrics__col--plain">
          <div className="np-lyrics__eyebrow mono">LYRICS · LRCLIB</div>
          <div className="np-lyrics__plain">{plain.split(/\r?\n/).map((l, i) => <div key={i} className="np-lyrics__line is-plain">{l || ' '}</div>)}</div>
        </div>
      ) : null}
      {state === 'none' ? <div className="np-lyrics__col np-lyrics__col--empty"><div className="np-lyrics__empty">No lyrics for this track.</div></div> : null}
      {state === 'loading' ? <div className="np-lyrics__col np-lyrics__col--loading"><div className="np-lyrics__skeleton"><i /><i /><i /><i /><i /></div></div> : null}
    </div>
  );
}
