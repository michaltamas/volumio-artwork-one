/**
 * The queue page (/queue): the frame's own list of what is queued — a sticky toolbar
 * (shuffle · repeat · save as playlist · clear) and one row per track with the cover, the
 * title and artist · album, the length, and a remove glyph. The current row is marked and
 * scrolled into view once; a held row can be dragged to another place.
 */
import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { useQueue } from '../core/store/queue';
import { usePlayer } from '../core/store/player';
import { useModal } from '../core/store/modal';
import { albumart } from '../core/api';
import { faIcon } from '../core/browseActions';

const HOLD = 150;   // the frame's sortable waits this long before a press becomes a drag

function mmss(duration: any): string {
  const s = Math.max(0, parseInt(duration, 10) || 0);
  const mm = Math.floor(s / 60), ss = s % 60;
  return mm + ':' + (ss < 10 ? '0' + ss : ss);
}

export default function PlayQueue() {
  const queue = useQueue(s => s.queue);
  const st = usePlayer(s => s.state);
  const [order, setOrder] = useState<number[] | null>(null);   // the rows' order while one is being dragged
  const [sorting, setSorting] = useState<number>(-1);
  const scrolled = useRef(false);
  const position = typeof st.position === 'number' ? st.position : -1;
  const current = st.status !== 'stop' ? position : -1;

  // the current row is brought into view on the first render that has it
  useEffect(() => {
    if (scrolled.current || !queue.length) { return; }
    scrolled.current = true;
    const el = document.getElementById('itemQueue-' + position);
    if (el && st.status !== 'stop') { el.scrollIntoView(); }
  }, [queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (i: number) => useQueue.getState().play(i);
  const remove = (i: number) => useQueue.getState().remove(i);
  const repeat = () => {
    if (!st.repeat) { usePlayer.getState().repeat(true, false); }
    else if (!st.repeatSingle) { usePlayer.getState().repeat(true, true); }
    else { usePlayer.getState().repeat(false, false); }
  };
  const save = () => useModal.getState().open('playlist', { title: 'Add to playlist', addQueue: true });

  // drag to reorder: a press held for 150 ms lifts the row; the rows it crosses step aside
  const onPointerDown = (e: React.PointerEvent<HTMLLIElement>, i: number) => {
    if (e.button && e.button !== 0) { return; }
    const li = e.currentTarget; const list = li.parentElement as HTMLElement;
    const x0 = e.clientX, y0 = e.clientY; let armed = false, from = i, to = i;
    let ord = queue.map((_, k) => k);
    const timer = window.setTimeout(() => { armed = true; setSorting(i); setOrder(ord); try { li.setPointerCapture(e.pointerId); } catch { /* older engines */ } }, HOLD);
    const move = (ev: PointerEvent) => {
      if (!armed) { if (Math.abs(ev.clientX - x0) > 6 || Math.abs(ev.clientY - y0) > 6) { window.clearTimeout(timer); end(); } return; }
      ev.preventDefault();
      const rows = Array.from(list.children) as HTMLElement[];
      const under = rows.find(r => { const b = r.getBoundingClientRect(); return ev.clientY >= b.top && ev.clientY < b.bottom; });
      if (!under) { return; }
      const idx = parseInt(under.getAttribute('data-index') || '', 10);
      const pos = ord.indexOf(idx), cur = ord.indexOf(from);
      if (isNaN(idx) || pos === cur) { return; }
      ord = ord.slice(); ord.splice(cur, 1); ord.splice(pos, 0, from); to = pos; setOrder(ord);
    };
    const end = () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
      if (armed && to !== from) { useQueue.getState().move(from, to); }
      setSorting(-1); setOrder(null);
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  };

  const rows = order && order.length === queue.length ? order : queue.map((_, k) => k);

  return (
    <div id="playQueue">
      <div className="trackInfoBarButtons">
        <button type="button" className={'btn btn-link' + (st.random ? ' active' : '')} onClick={() => usePlayer.getState().shuffle()} title="Random"><i className="fa fa-random"><Icon name="shuffle" /></i></button>
        <button type="button" className={'btn btn-link' + (st.repeat ? ' active' : '')} onClick={repeat} title="Repeat"><i className="fa fa-repeat"><Icon name="repeat" />{st.repeat && st.repeatSingle ? '1' : ''}</i></button>
        <button type="button" className="btn btn-link" onClick={save} title="Save queue as playlist"><i className="fa fa-save"><Icon name="save" /></i></button>
        <button type="button" className="btn btn-link" onClick={() => useQueue.getState().clear()} title="Clear queue"><i className="fa fa-trash"><Icon name="delete" /></i></button>
      </div>
      <div id="playQueueList">
        {queue.length ? (
          <ul>
            {rows.map(i => { const item = queue[i]; if (!item) { return null; } return (
              <li id={'itemQueue-' + i} key={item.uri + '|' + i} data-index={i} className={(i === current ? 'isPlaying' : '') + (i === sorting ? ' sorting' : '')} onPointerDown={(e) => onPointerDown(e, i)}>
                <div className="image" onClick={() => play(i)}>
                  <span className="rollover"><span className="material-symbols-rounded rollover__play">play_arrow</span><span className="material-symbols-rounded rollover__sort">swap_horiz</span></span>
                  {item.icon ? <i className={item.icon}><Icon name={faIcon(item.icon)} /></i> : <img src={albumart(item.albumart)} alt={item.title || item.name || ''} />}
                </div>
                <div className="titleArtist" onClick={() => play(i)}>
                  <div className="title">{' ' + (item.name || '') + ' '}</div>
                  {item.artist || item.album ? <div className="artist-album">{' ' + (item.artist || '') + (item.album ? ' - ' + item.album : '') + ' '}</div> : null}
                </div>
                {item.duration ? <div className="duration mono">{mmss(item.duration)}</div> : null}
                <div className="commandButtons">
                  <button type="button" className="btn-link" onClick={() => remove(i)}><i className="fa fa-times-circle"><Icon name="cancel" /></i></button>
                </div>
              </li>
            ); })}
          </ul>
        ) : <ul />}
      </div>
    </div>
  );
}
