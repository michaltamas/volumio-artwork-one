/**
 * A volume in the Zones & outputs cards (handoff mobile-volume v2): the level top-right (a tap mutes),
 * and a row under the card's head — − and + either side of a slider. One target per card: this device,
 * another zone, or this browser while it plays.
 *
 * This device steps with Volumio's own + and − (its Volume steps and Max volume level, nothing to read
 * first) and shows what Volumio answers. Another zone and the browser step by STEP, as values. The
 * slider drags relatively — a tap on the track never jumps the volume — and holds the pointer, so the
 * sheet cannot close under it. While a value is being set it shows at once; it goes out at most every
 * 150 ms (always the latest), and the player's echo is ignored for 600 ms after the last input.
 */
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

export const STEP = 2;            // a zone's or the browser's step (Volumio's own is used for this device)
const SEND_EVERY = 150;
const ECHO_QUIET = 600;
const HOLD_AFTER = 420;
const HOLD_EVERY = 150;           // a held − / + repeats no faster than the commands may go out

export interface VolumeTarget {
  value: number;
  muted: boolean;
  /** one step down or up: Volumio's for this device, STEP elsewhere */
  step: (dir: 1 | -1) => void;
  /** an exact value (the slider, Page Up/Down) */
  set: (v: number) => void;
  toggleMute: () => void;
  /** steps that answer late (this device): the value shown is the player's, not a guess */
  stepsRemote?: boolean;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
export const volumeIcon = (v: number, muted: boolean) => muted ? 'volume_off' : v === 0 ? 'volume_mute' : v < 41 ? 'volume_down' : 'volume_up';

/** the value to show: the local one while it is being set, the player's otherwise; sends are throttled */
export function useVolume(t: VolumeTarget) {
  const [local, setLocal] = useState<number | null>(null);
  const lastInput = useRef(0);
  const sendTimer = useRef<number | null>(null);
  const lastSent = useRef(0);
  const pending = useRef<number | null>(null);
  const quietTimer = useRef<number | null>(null);
  const target = useRef(t); target.current = t;
  useEffect(() => () => { if (sendTimer.current) { window.clearTimeout(sendTimer.current); } if (quietTimer.current) { window.clearTimeout(quietTimer.current); } }, []);
  const flush = () => { sendTimer.current = null; if (pending.current === null) { return; } lastSent.current = Date.now(); target.current.set(pending.current); pending.current = null; };
  // after the quiet time the player's value takes over again (a redraw is enough: local is dropped)
  const quiet = () => { if (quietTimer.current) { window.clearTimeout(quietTimer.current); } quietTimer.current = window.setTimeout(() => { quietTimer.current = null; setLocal(null); }, ECHO_QUIET); };
  const setValue = (v: number) => {
    const n = clamp(v);
    lastInput.current = Date.now(); setLocal(n); quiet();
    pending.current = n;
    if (sendTimer.current) { return; }
    const wait = Math.max(0, lastSent.current + SEND_EVERY - Date.now());
    if (wait === 0) { flush(); } else { sendTimer.current = window.setTimeout(flush, wait); }
  };
  const shown = local !== null ? local : clamp(t.value);
  const step = (dir: 1 | -1) => {
    if (t.stepsRemote) { if (local !== null) { setLocal(null); } t.step(dir); return; }   // the player answers with the new value
    setValue(shown + dir * STEP);
  };
  return { shown, muted: t.muted && local === null, setValue, step };
}

/** the level, top-right of a card: icon and number; a tap mutes or unmutes */
export function VolumeLevel({ value, muted, onToggle, label }: { value: number; muted: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" className={'aw-vol__level' + (muted ? ' is-muted' : '')} onClick={onToggle} aria-label={(muted ? 'Unmute ' : 'Mute ') + label} aria-pressed={muted} title={muted ? 'Unmute' : 'Mute'}>
      <Icon name={volumeIcon(value, muted)} /><span className="aw-vol__num mono">{muted ? '—' : value}</span>
    </button>
  );
}

/** a − or + that repeats while held (after 420 ms) */
function StepButton({ dir, onStep, label }: { dir: 1 | -1; onStep: (d: 1 | -1) => void; label: string }) {
  const hold = useRef<{ t: number | null; iv: number | null }>({ t: null, iv: null });
  const stop = () => { if (hold.current.t) { window.clearTimeout(hold.current.t); } if (hold.current.iv) { window.clearInterval(hold.current.iv); } hold.current = { t: null, iv: null }; };
  useEffect(() => stop, []);
  const step = useRef(onStep); step.current = onStep;
  return (
    <button type="button" className="aw-vol__step" aria-label={label}
      onPointerDown={(e) => {
        if (e.button) { return; }
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older engines */ }
        stop(); step.current(dir);
        hold.current.t = window.setTimeout(() => { hold.current.iv = window.setInterval(() => step.current(dir), HOLD_EVERY); }, HOLD_AFTER);
      }}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
      // the press already stepped; a click from the keyboard (Enter, Space: no pointer, detail 0) steps once
      onClick={(e) => { if (e.detail === 0) { step.current(dir); } }}
      onContextMenu={(e) => e.preventDefault()}>
      <Icon name={dir > 0 ? 'add' : 'remove'} />
    </button>
  );
}

/** − · slider · +, the row under a card's head */
export function VolumeRow({ v, label }: { v: ReturnType<typeof useVolume>; label: string }) {
  const drag = useRef<{ x0: number; v0: number; w: number } | null>(null);
  const shown = v.muted ? 0 : v.shown;
  return (
    <div className="aw-vol__row">
      <StepButton dir={-1} onStep={v.step} label={'Lower ' + label} />
      <div className="aw-vol__slider" role="slider" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.shown} aria-valuetext={v.muted ? 'muted' : String(v.shown)}
        onPointerDown={(e) => {
          if (e.button) { return; }
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older engines */ }
          const r = e.currentTarget.getBoundingClientRect();
          drag.current = { x0: e.clientX, v0: v.shown, w: Math.max(1, r.width - 20) };   // the track sits 10px in from either end
        }}
        onPointerMove={(e) => { const d = drag.current; if (!d) { return; } const n = clamp(d.v0 + (e.clientX - d.x0) / d.w * 100); if (n !== v.shown) { v.setValue(n); } }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
        onKeyDown={(e) => {
          const k = e.key;
          if (k === 'ArrowRight' || k === 'ArrowUp') { e.preventDefault(); v.step(1); }
          else if (k === 'ArrowLeft' || k === 'ArrowDown') { e.preventDefault(); v.step(-1); }
          else if (k === 'PageUp') { e.preventDefault(); v.setValue(v.shown + 10); }
          else if (k === 'PageDown') { e.preventDefault(); v.setValue(v.shown - 10); }
        }}>
        <div className="aw-vol__track"><div className="aw-vol__fill" style={{ width: shown + '%' }} /><div className="aw-vol__knob" style={{ left: shown + '%' }} /></div>
      </div>
      <StepButton dir={1} onStep={v.step} label={'Raise ' + label} />
    </div>
  );
}
