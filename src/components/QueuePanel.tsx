/**
 * The floating queue panel (mockup "Queue — floating overlay panel"): header, chips,
 * NOW & NEXT rows, each dragged by itself to reorder, a footer with what happens at the end.
 * On Now Playing in a wide window it can be pinned: then it is docked beside the page, full height.
 * As a page (/queue, the frame's queue state) the same panel is laid out in the page: static, its width, scrolling with it.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Dropdown, { type MenuEntry } from './Dropdown';
import { rowDrag, justDragged } from '../core/rowDrag';
import { useQueue, type QueueItem } from '../core/store/queue';
import { usePlayer } from '../core/store/player';
import { useUi, isQueueDocked, canDockQueue } from '../core/store/ui';
import { useModal } from '../core/store/modal';
import { useStopAfter } from '../core/store/stopAfter';
import { browseUrl } from '../core/browseUrl';
import { useBrowse } from '../core/store/browse';
import { usePlaylists } from '../core/store/playlists';
import { addToPlaylist } from '../core/browseActions';
import { useBrowserLoading } from '../core/localPlayback';
import { albumart } from '../core/api';
import Spinner from './Spinner';

function fmt(sec: any): string {
  const s = Math.max(0, parseInt(sec, 10) || 0);
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' + r : r);
}

const CLEAR_ASKS_FROM = 6;   // a queue this long is not thrown away by one tap

// the ⋯ of a row: play it, pull it up next, stop after it, keep it, open its artist or album in the library, take it out
function rowEntries(t: QueueItem, i: number, position: number, goTo: (item: any) => void): MenuEntry[] {
  const q = useQueue.getState(), sa = useStopAfter.getState();
  const current = i === position;
  const song = { uri: String(t.uri || ''), service: t.service, type: 'song', title: t.name || t.title, name: t.name || t.title, artist: t.artist, album: t.album, albumart: t.albumart };
  const out: MenuEntry[] = [];
  if (!current) { out.push({ icon: 'play_arrow', label: 'Play now', onClick: () => q.play(i) }); }
  if (!current && position >= 0 && i !== position + 1) { out.push({ icon: 'playlist_play', label: 'Play next', onClick: () => q.move(i, i > position ? position + 1 : position) }); }
  out.push({ icon: 'stop_circle', label: sa.isMarked(i) ? "Don't stop after this" : 'Stop after this', onClick: () => sa.toggle(i) });
  if (song.uri && t.service) {
    out.push({ label: '-', onClick: () => {} });
    out.push({ icon: 'favorite', label: 'Add to Favorites', onClick: () => usePlaylists.getState().addToFavourites(song) });
    out.push({ icon: 'playlist_add', label: 'Add to Playlist…', onClick: () => addToPlaylist(song as any) });
  }
  if (t.service === 'mpd' && t.artist) {
    out.push({ label: '-', onClick: () => {} });
    if (t.album) { out.push({ icon: 'album', label: 'Go to album', onClick: () => goTo({ uri: 'albums://' + encodeURIComponent(String(t.artist)) + '/' + encodeURIComponent(String(t.album)), title: t.album, name: t.album, type: 'folder', service: 'mpd' }) }); }
    out.push({ icon: 'person', label: 'Go to artist', onClick: () => goTo({ uri: 'artists://' + encodeURIComponent(String(t.artist)), title: t.artist, name: t.artist, type: 'folder', service: 'mpd' }) });
  }
  out.push({ label: '-', onClick: () => {} });
  out.push({ icon: 'close', label: 'Remove', danger: true, onClick: () => q.remove(i) });
  return out;
}

export default function QueuePanel({ page }: { page?: boolean }) {
  const nav = useNavigate();
  const onPlayback = !page && useLocation().pathname === '/playback';
  const mark = useStopAfter(s => s.mark);
  const docked = useUi(s => !page && isQueueDocked(s, onPlayback));
  const canPin = useUi(s => s.dockRoom) && onPlayback;
  // pinned on Now Playing the queue is only ever the docked one, never the floating sheet as well
  const open = useUi(s => !!page || docked || (s.queueOpen && !canDockQueue(s, onPlayback)));
  const queue = useQueue(s => s.queue);
  const st = usePlayer(s => s.state);
  const elapsedMs = usePlayer(s => s.elapsedMs);
  const root = useRef<HTMLDivElement>(null);
  const position = typeof st.position === 'number' ? st.position : -1;
  const playing = st.status === 'play';
  const browserLoading = useBrowserLoading();   // playing on the device, not yet in this browser

  // seconds still to play: the rest of this track plus every track after it — up to the marked one, when a stop is set
  const stopAt = mark && mark.position >= position ? mark.position : -1;
  let secondsLeft: number | null = null;
  if (queue.length) {
    const from = Math.max(0, position);
    let total = 0, known = false;
    queue.forEach((t, i) => { if (i < from || (stopAt >= 0 && i > stopAt)) { return; } const d = parseInt(String(t.duration), 10); if (d > 0) { known = true; total += d; } });
    if (known) {
      if (position >= 0 && st.status !== 'stop') { total -= Math.floor(elapsedMs / 1000); }
      secondsLeft = Math.max(0, total);
    }
  }
  const minutesLeft = secondsLeft === null ? null : Math.round(secondsLeft / 60);
  let endsAt: string | null = null;
  if (secondsLeft !== null && (!st.repeat || stopAt >= 0)) { const d = new Date(Date.now() + secondsLeft * 1000); endsAt = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  const endNote = stopAt >= 0 ? (stopAt === position ? 'Stops after this track' : 'Stops after ' + (queue[stopAt].name || queue[stopAt].title || 'the marked track'))
    : st.repeat && st.repeatSingle ? 'Repeats this track' : st.repeat ? 'Repeats the queue' : 'Stops after the queue ends';
  // the library's page for a row's artist or album: the floating queue goes away, the page opens
  const goTo = (item: any) => { if (!docked && !page) { useUi.getState().hideQueue(); } useBrowse.getState().open(item, true); nav(browseUrl(item)); };
  const clear = async () => {
    const n = queue.length;
    if (n >= CLEAR_ASKS_FROM && !(await useModal.getState().confirm({ title: 'Clear queue', message: 'Remove all ' + n + ' tracks from the queue?', danger: true }))) { return; }
    useQueue.getState().clear();
  };

  useEffect(() => {
    if (!open) { return; }
    const el = root.current?.querySelector('.aw-queue__row.is-current');
    if (el) { el.scrollIntoView({ block: 'nearest' }); }
    if (docked || page) { return; }   // docked (or the page) it is part of the page: Escape does not take it away
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { useUi.getState().hideQueue(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, docked, page]);

  // drag to reorder, by the whole row (core/rowDrag): on release the player gets moveQueue and re-renders the new order
  const onRowDown = (e: React.PointerEvent<HTMLDivElement>) => rowDrag(e, '.aw-queue__row', (from, to) => useQueue.getState().move(from, to));

  return (
    <div className={'aw-queue' + (open ? ' open' : '') + (onPlayback ? ' on-playback' : '') + (docked ? ' is-docked' : '') + (page ? ' aw-queue--page' : '')} role={docked || page ? 'complementary' : 'dialog'} aria-label="Queue" aria-hidden={!open} ref={root}>
      <div className="aw-queue__head">
        <div className="aw-queue__titles">
          <div className="aw-queue__title">Queue</div>
          <div className="aw-queue__sub mono">{queue.length} TRACKS{minutesLeft !== null ? <span>&nbsp;· {minutesLeft} MIN LEFT</span> : null}</div>
        </div>
        {canPin ? <button type="button" className={'aw-queue__pin' + (docked ? ' active' : '')} onClick={() => useUi.getState().toggleQueuePin()} aria-pressed={docked} aria-label={docked ? 'Unpin' : 'Pin beside the cover'} title={docked ? 'Unpin' : 'Pin beside the cover'}><Icon name="push_pin" /></button> : null}
        {docked || page ? null : <button type="button" className="aw-queue__close" onClick={() => useUi.getState().hideQueue()} aria-label="Close" title="Close"><Icon name="close" /></button>}
      </div>
      <div className="aw-queue__chips">
        <button type="button" className={'aw-queue__chip' + (st.random ? ' active' : '')} onClick={() => usePlayer.getState().shuffle()} title="Shuffle"><Icon name="shuffle" /><span>Shuffle</span></button>
        <button type="button" className={'aw-queue__chip' + (st.repeat ? ' active' : '')} onClick={() => usePlayer.getState().cycleRepeat()} title="Repeat"><Icon name={st.repeat && st.repeatSingle ? 'repeat_one' : 'repeat'} /><span>Repeat</span></button>
        <button type="button" className="aw-queue__chip" onClick={() => useModal.getState().open('playlist', { addQueue: true, title: 'Add to playlist' })} title="Save queue as playlist"><Icon name="playlist_add" /><span>Save as playlist</span></button>
        <button type="button" className="aw-queue__chip aw-queue__chip--danger" onClick={clear} title="Clear queue"><Icon name="delete_sweep" /><span>Clear</span></button>
      </div>
      <div className="aw-queue__sechead">
        <span className="mono">NOW &amp; NEXT</span>
        {queue.length > 1 ? <span className="aw-queue__hint"><span className="aw-queue__hint--mouse">Drag a track to reorder</span><span className="aw-queue__hint--touch">Hold a track to move it</span></span> : null}
      </div>
      <div className="aw-queue__scroll">
        <div className="aw-queue__list">
          {queue.map((t, i) => {
            const current = i === position;
            const marked = !!mark && mark.position === i;
            return (
              <div key={t.uri + i} className={'aw-queue__row' + (current ? ' is-current' : '') + (current && !playing ? ' is-paused' : '') + (marked ? ' is-stop-after' : '')} onPointerDown={onRowDown} onClick={() => { if (!justDragged()) { useQueue.getState().play(i); } }} onContextMenu={(e) => { if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType !== 'mouse') { e.preventDefault(); } }}>
                <div className="aw-queue__slot">
                  {current ? (current && playing && browserLoading ? <Spinner size={16} className="aw-loading-spin" /> : <span className="aw-queue__eq"><i /><i /><i /></span>) : <><span className="aw-queue__num mono">{i + 1}</span><span className="material-symbols-rounded aw-queue__play">play_arrow</span></>}
                </div>
                {t.albumart ? <img className="aw-queue__cover" src={albumart(t.albumart)} alt="" /> : (t.icon ? <span className="aw-queue__cover aw-queue__cover--icon"><i className={t.icon} /></span> : null)}
                <div className="aw-queue__text">
                  <div className="aw-queue__name">{t.name || t.title}</div>
                  {(t.artist || t.album) ? <div className="aw-queue__meta">{t.artist}{t.artist && t.album ? <span>&nbsp;·&nbsp;</span> : null}{t.album}</div> : null}
                </div>
                {marked ? <span className="aw-queue__stop" title="Stops after this track"><Icon name="stop_circle" /></span> : null}
                {t.duration ? <span className="aw-queue__time mono">{fmt(t.duration)}</span> : null}
                {/* the ⋯ and the × are the row's own buttons: neither starts a drag nor plays the row */}
                <span className="aw-queue__more" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <Dropdown toggleClass="aw-queue__more-btn" toggle={<Icon name="more_vert" />} entries={rowEntries(t, i, position, goTo)} />
                </span>
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
