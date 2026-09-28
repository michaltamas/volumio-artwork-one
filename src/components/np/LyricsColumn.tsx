/**
 * The words (handoff 6a, 6d): the column used in the desktop face and in the phone sheet.
 * Synced lines keep the current one at the optical centre: on a line change the stack
 * translates over 280 ms; a seek jumps without tweening.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLyrics } from '../../core/store/lyrics';
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

export default function LyricsColumn() {
  const state = useLyrics(s => s.state);
  const lines = useLyrics(s => s.lines);
  const plain = useLyrics(s => s.plain);
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
    if (state !== 'synced') { return; }
    // a jump of more than one line, or backwards, is a seek: no tween
    const tween = last.current !== -2 && index - last.current === 1;
    last.current = index;
    const raf = requestAnimationFrame(() => place(index, tween));
    return () => cancelAnimationFrame(raf);
  }, [index, state, lines]);
  useEffect(() => {
    const c = col.current; if (!c || typeof ResizeObserver === 'undefined') { return; }
    const ro = new ResizeObserver(() => place(last.current, false)); ro.observe(c);
    return () => ro.disconnect();
  }, [state]);
  const seekToLine = (l: { t: number }) => { const st: any = usePlayer.getState().state; if (!l || !st || !st.duration || st.disableUi) { return; } usePlayer.getState().seekTo(l.t / 1000); };
  return (
    <div className={'np-lyrics np-lyrics--' + state}>
      {state === 'synced' ? <div className="np-lyrics__eyebrow np-lyrics__eyebrow--synced mono">LYRICS · LRCLIB</div> : null}
      {state === 'synced' ? (
        <div className="np-lyrics__col np-lyrics__col--synced" ref={col}>
          <div className="np-lyrics__stack">
            {lines.map((l, i) => (
              <div key={i} className={'np-lyrics__line ' + lineClass(i, index)} data-line={i} onClick={() => seekToLine(l)} role="button" tabIndex={-1}>
                <span className="np-lyrics__mark" aria-hidden="true" /><span className="np-lyrics__text">{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {state === 'plain' ? (
        <div className="np-lyrics__col np-lyrics__col--plain">
          <div className="np-lyrics__eyebrow mono">LYRICS · LRCLIB</div>
          <div className="np-lyrics__plain">{plain.split(/\r?\n/).map((l, i) => <div key={i} className="np-lyrics__line is-plain">{l || '\u00a0'}</div>)}</div>
        </div>
      ) : null}
      {state === 'none' ? <div className="np-lyrics__col np-lyrics__col--empty"><div className="np-lyrics__empty">No lyrics for this track.</div></div> : null}
      {state === 'loading' ? <div className="np-lyrics__col np-lyrics__col--loading"><div className="np-lyrics__skeleton"><i /><i /><i /><i /><i /></div></div> : null}
    </div>
  );
}
