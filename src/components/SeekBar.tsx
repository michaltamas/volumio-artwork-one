/**
 * The seek bar (mockup 2a 2b 2e): elapsed · a track with a handle · remaining / duration.
 * The whole hit area scrubs by pointer; the fill and the label follow the finger and the seek
 * is sent once on release. The arrow keys step by five seconds.
 */
import { useRef, useState } from 'react';
import { usePlayer } from '../core/store/player';
import { mmss } from '../core/format';

export default function SeekBar() {
  const duration = usePlayer(s => s.state.duration || 0);
  const elapsedMs = usePlayer(s => s.elapsedMs);
  const seekTo = usePlayer(s => s.seekTo);
  const [scrub, setScrub] = useState<number | null>(null);
  const hit = useRef<HTMLDivElement>(null);
  if (!duration) { return null; }
  const totalMs = duration * 1000;
  const shownMs = scrub === null ? Math.min(elapsedMs, totalMs) : scrub * totalMs;
  const pct = totalMs ? Math.min(100, Math.max(0, shownMs / totalMs * 100)) : 0;

  const pctAt = (x: number) => { const r = hit.current!.getBoundingClientRect(); return Math.min(1, Math.max(0, (x - r.left) / r.width)); };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const w = hit.current!;
    try { w.setPointerCapture(e.pointerId); } catch { /* older engines */ }
    setScrub(pctAt(e.clientX));
    const move = (ev: PointerEvent) => setScrub(pctAt(ev.clientX));
    const up = (ev: PointerEvent) => {
      w.removeEventListener('pointermove', move); w.removeEventListener('pointerup', up); w.removeEventListener('pointercancel', up);
      const p = pctAt(ev.clientX);
      setScrub(null);
      seekTo(p * duration);
    };
    w.addEventListener('pointermove', move); w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const cur = elapsedMs / 1000;
    if (e.key === 'ArrowRight') { e.preventDefault(); seekTo(Math.min(duration, cur + 5)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seekTo(Math.max(0, cur - 5)); }
  };
  return (
    <div className="artwork-seek">
      <span className="seek-time seek-elapsed mono">{mmss(shownMs)}</span>
      <div className="artwork-seek__hit" ref={hit} role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} onPointerDown={onPointerDown} onKeyDown={onKey}>
        <div className="seek-track">
          <div className="seek-fill" style={{ width: pct + '%' }} />
          <div className="seek-handle" style={{ left: pct + '%' }} />
        </div>
      </div>
      <span className="seek-time seek-remaining mono">-{mmss(totalMs - shownMs)}</span>
      <span className="seek-time seek-duration mono">{mmss(totalMs)}</span>
    </div>
  );
}
