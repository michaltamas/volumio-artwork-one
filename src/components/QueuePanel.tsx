/**
 * The floating queue panel (mockup "Queue — floating overlay panel"): header, chips,
 * NOW & NEXT rows with drag to reorder, a footer with what happens at the end.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useQueue } from '../core/store/queue';
import { usePlayer } from '../core/store/player';
import { useUi } from '../core/store/ui';
import { useModal } from '../core/store/modal';
import { useBrowserLoading } from '../core/localPlayback';
import { albumart } from '../core/api';
import Spinner from './Spinner';

function fmt(sec: any): string {
  const s = Math.max(0, parseInt(sec, 10) || 0);
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' + r : r);
}

export default function QueuePanel() {
  const open = useUi(s => s.queueOpen);
  const queue = useQueue(s => s.queue);
  const st = usePlayer(s => s.state);
  const elapsedMs = usePlayer(s => s.elapsedMs);
  const root = useRef<HTMLDivElement>(null);
  const onPlayback = useLocation().pathname === '/playback';
  const position = typeof st.position === 'number' ? st.position : -1;
  const playing = st.status === 'play';
  const browserLoading = useBrowserLoading();   // playing on the device, not yet in this browser

  // seconds still to play: the rest of this track plus every track after it
  let secondsLeft: number | null = null;
  if (queue.length) {
    const from = Math.max(0, position);
    let total = 0, known = false;
    queue.forEach((t, i) => { if (i < from) { return; } const d = parseInt(String(t.duration), 10); if (d > 0) { known = true; total += d; } });
    if (known) {
      if (position >= 0 && st.status !== 'stop') { total -= Math.floor(elapsedMs / 1000); }
      secondsLeft = Math.max(0, total);
    }
  }
  const minutesLeft = secondsLeft === null ? null : Math.round(secondsLeft / 60);
  let endsAt: string | null = null;
  if (secondsLeft !== null && !st.repeat) { const d = new Date(Date.now() + secondsLeft * 1000); endsAt = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  const endNote = st.repeat && st.repeatSingle ? 'Repeats this track' : st.repeat ? 'Repeats the queue' : 'Stops after the queue ends';

  useEffect(() => {
    if (!open) { return; }
    const el = root.current?.querySelector('.aw-queue__row.is-current');
    if (el) { el.scrollIntoView({ block: 'nearest' }); }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { useUi.getState().hideQueue(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // drag to reorder: the dragged row follows the pointer, the rows it passes slide aside, and
  // on release the player gets moveQueue and re-renders the new order
  const onDragStart = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.button) { return; }
    const row = e.currentTarget.closest('.aw-queue__row') as HTMLElement | null; const list = row?.parentElement;
    if (!row || !list) { return; }
    e.preventDefault();
    const rows = Array.from(list.querySelectorAll<HTMLElement>('.aw-queue__row'));
    const from = rows.indexOf(row); if (from < 0) { return; }
    const rects = rows.map(r => r.getBoundingClientRect());
    const startY = e.clientY; let to = from;
    row.classList.add('is-dragging'); list.classList.add('is-reordering');
    const place = (y: number) => {
      const dy = y - startY;
      const cy = rects[from].top + rects[from].height / 2 + dy;
      to = from;
      rects.forEach((rc, i) => { if (i < from && cy < rc.top + rc.height / 2) { to = Math.min(to, i); } if (i > from && cy > rc.top + rc.height / 2) { to = Math.max(to, i); } });
      rows.forEach((r, i) => {
        if (i === from) { r.style.transform = 'translateY(' + dy + 'px)'; return; }
        let shift = 0;
        if (from < to && i > from && i <= to) { shift = -rects[from].height; }
        if (from > to && i >= to && i < from) { shift = rects[from].height; }
        r.style.transform = shift ? 'translateY(' + shift + 'px)' : '';
      });
    };
    const move = (ev: PointerEvent) => place(ev.clientY);
    const up = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
      rows.forEach(r => { r.style.transform = ''; });
      row.classList.remove('is-dragging'); list.classList.remove('is-reordering');
      if (to !== from) { useQueue.getState().move(from, to); }
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  };

  return (
    <div className={'aw-queue' + (open ? ' open' : '') + (onPlayback ? ' on-playback' : '')} role="dialog" aria-label="Queue" aria-hidden={!open} ref={root}>
      <div className="aw-queue__head">
        <div className="aw-queue__titles">
          <div className="aw-queue__title">Queue</div>
          <div className="aw-queue__sub mono">{queue.length} TRACKS{minutesLeft !== null ? <span>&nbsp;· {minutesLeft} MIN LEFT</span> : null}</div>
        </div>
        <button type="button" className="aw-queue__close" onClick={() => useUi.getState().hideQueue()} aria-label="Close" title="Close"><Icon name="close" /></button>
      </div>
      <div className="aw-queue__chips">
        <button type="button" className={'aw-queue__chip' + (st.random ? ' active' : '')} onClick={() => usePlayer.getState().shuffle()} title="Shuffle"><Icon name="shuffle" /><span>Shuffle</span></button>
        <button type="button" className={'aw-queue__chip' + (st.repeat ? ' active' : '')} onClick={() => usePlayer.getState().cycleRepeat()} title="Repeat"><Icon name={st.repeat && st.repeatSingle ? 'repeat_one' : 'repeat'} /><span>Repeat</span></button>
        <button type="button" className="aw-queue__chip" onClick={() => useModal.getState().open('playlist', { addQueue: true, title: 'Add to playlist' })} title="Save queue as playlist"><Icon name="playlist_add" /><span>Save as playlist</span></button>
        <button type="button" className="aw-queue__chip aw-queue__chip--danger" onClick={() => useQueue.getState().clear()} title="Clear queue"><Icon name="delete_sweep" /><span>Clear</span></button>
      </div>
      <div className="aw-queue__sechead">
        <span className="mono">NOW &amp; NEXT</span>
        {queue.length > 1 ? <span className="aw-queue__hint">Drag to reorder</span> : null}
      </div>
      <div className="aw-queue__scroll">
        <div className="aw-queue__list">
          {queue.map((t, i) => {
            const current = i === position;
            return (
              <div key={t.uri + i} className={'aw-queue__row' + (current ? ' is-current' : '') + (current && !playing ? ' is-paused' : '')} onClick={() => useQueue.getState().play(i)}>
                <span className="material-symbols-rounded aw-queue__drag" aria-hidden="true" onPointerDown={onDragStart}>drag_indicator</span>
                <div className="aw-queue__slot">
                  {current ? (current && playing && browserLoading ? <Spinner size={16} className="aw-loading-spin" /> : <span className="aw-queue__eq"><i /><i /><i /></span>) : <><span className="aw-queue__num mono">{i + 1}</span><span className="material-symbols-rounded aw-queue__play">play_arrow</span></>}
                </div>
                {t.albumart ? <img className="aw-queue__cover" src={albumart(t.albumart)} alt="" /> : (t.icon ? <span className="aw-queue__cover aw-queue__cover--icon"><i className={t.icon} /></span> : null)}
                <div className="aw-queue__text">
                  <div className="aw-queue__name">{t.name || t.title}</div>
                  {(t.artist || t.album) ? <div className="aw-queue__meta">{t.artist}{t.artist && t.album ? <span>&nbsp;·&nbsp;</span> : null}{t.album}</div> : null}
                </div>
                {t.duration ? <span className="aw-queue__time mono">{fmt(t.duration)}</span> : null}
                <button type="button" className="aw-queue__remove" onClick={(e) => { e.stopPropagation(); useQueue.getState().remove(i); }} aria-label="Remove" title="Remove"><Icon name="close" /></button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="aw-queue__foot">
        <Icon name="bedtime" />
        <span className="aw-queue__note">{endNote}</span>
        {endsAt ? <span className="aw-queue__ends mono">ENDS {endsAt}</span> : null}
      </div>
    </div>
  );
}
