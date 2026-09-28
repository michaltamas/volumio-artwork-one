/**
 * Now Playing (spec §6.1): the cover beside the title, artist and album; a column with three
 * faces — Cover, Info, Lyrics — switched above the title; the seek bar, the transport, what
 * plays next and the volume along the bottom. On the phone the parts restack (zz-fluid).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import SeekBar from '../components/SeekBar';
import Transport from '../components/Transport';
import Volume from '../components/Volume';
import ArtStack from '../components/ArtStack';
import { usePlayer } from '../core/store/player';
import { useQueue } from '../core/store/queue';
import { useMultiroom } from '../core/store/multiroom';
import { useSignal } from '../core/store/signal';
import { useUi } from '../core/store/ui';
import { albumart } from '../core/api';
import { splitVal, quality, format, signal } from '../core/format';
import { useLyrics } from '../core/store/lyrics';
import { useTrackInfo } from '../core/store/trackInfo';
import { useSheetDrag, PHONE } from '../core/useSheetDrag';
import LyricsColumn from '../components/np/LyricsColumn';
import InfoFace from '../components/np/InfoFace';
import { addToPlaylist } from '../core/browseActions';
import { useSleep } from '../core/store/sleep';
import { useModal } from '../core/store/modal';
import { useExternalSource } from '../core/external';
import NpEmpty from '../components/np/NpEmpty';

type View = 'cover' | 'info' | 'lyrics';
const VIEW_KEY = 'aw-np-view';
// too little room for the Cover/Info/Lyrics switch: a narrow window (the phone layout included, width
// alone, no orientation clause there) OR a short-but-wide one (the existing 520px landscape breakpoint
// that already compacts the hero — matched here so the same window counts as "no room" for both)
const NARROW_NP_QUERY = '(max-width: 1100px), (max-height: 520px) and (orientation: landscape)';
function isNarrowNp(): boolean { try { return window.matchMedia(NARROW_NP_QUERY).matches; } catch { return false; } }

function readView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    const view = v === 'info' || v === 'lyrics' ? v : 'cover';
    return isNarrowNp() ? 'cover' : view;   // no switch to get back with once the window is narrow: always land on Cover there
  } catch { return 'cover'; }
}

export default function NowPlaying() {
  const st = usePlayer(s => s.state);
  const fav = usePlayer(s => s.favourite.favourite);
  const queue = useQueue(s => s.queue);
  const zone = useMultiroom(s => s.zones.find(z => z.isSelf)?.name || '');
  const output = useSignal(s => s.output);
  const alsa = useSignal(s => s.alsa);
  const resample = useSignal.getState().resample();
  const bitPerfect = useSignal.getState().bitPerfect();
  const queueOpen = useUi(s => s.queueOpen);
  const ext = useExternalSource();
  const nav = useNavigate();
  const [view, setView] = useState<View>(readView);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_NP_QUERY);
    const onNarrow = () => { if (mq.matches) { setView('cover'); } };
    onNarrow();
    mq.addEventListener('change', onNarrow);
    return () => mq.removeEventListener('change', onNarrow);
  }, []);
  const [leaving, setLeaving] = useState(false);
  const lyricsState = useLyrics(s => s.state);
  const info = useTrackInfo();
  const sleepRunning = useSleep(s => s.running());
  const sleepMinutes = useSleep(s => s.minutesLeft());
  const sheet = useRef<HTMLDivElement>(null);
  const lyricsOn = view === 'lyrics';
  const toggleLyrics = () => setView(v => v === 'lyrics' ? 'cover' : 'lyrics');
  const drag = useSheetDrag(sheet, toggleLyrics);
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* private mode */ } }, [view]);
  // Phone layout: the cover takes exactly what the other parts leave, measured (a title may wrap
  // to two or three lines), so the sheet never scrolls. Re-run on track/resize; cleared otherwise.
  const fitKey = [st.title, st.artist, st.album, st.samplerate, st.bitdepth, st.trackType].join('|');
  useEffect(() => {
    const fit = () => {
      const np = document.getElementById('np'), cover = document.getElementById('np-cover');
      if (!np || !cover) { return; }
      cover.style.width = '';
      if (!window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches) { return; }
      const content = document.getElementById('content');
      const avail = content ? content.clientHeight : window.innerHeight;
      const others = np.scrollHeight - cover.getBoundingClientRect().height;
      const maxW = np.clientWidth - 40 - 32;   /* the sheet's 20px sides and the mockup's 16px inset */
      cover.style.width = Math.max(96, Math.min(maxW, avail - others)) + 'px';
    };
    let t1 = window.setTimeout(fit, 60); const t2 = window.setTimeout(fit, 600);
    const onResize = () => { window.clearTimeout(t1); t1 = window.setTimeout(fit, 60); };
    window.addEventListener('resize', onResize);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.removeEventListener('resize', onResize); };
  }, [fitKey]);
  void alsa;

  const pos = typeof st.position === 'number' ? st.position : 0;
  const upNext = queue.slice(pos + 1, pos + 4);
  const bit = splitVal(st.bitdepth), rate = splitVal(st.samplerate);
  const q = quality(st);
  const fmt = format(st);
  // Leaving: the sheet is lifted out of the flow over the page's box, the page beneath is shown
  // at once (Shell), and the sheet slides down over it carrying its own wash.
  const goBack = () => {
    if (leaving) { return; }
    const np = document.getElementById('np'), box = np && np.parentElement;
    if (np && box) { const r = box.getBoundingClientRect(); np.style.animation = ''; np.style.position = 'fixed'; np.style.top = r.top + 'px'; np.style.left = r.left + 'px'; np.style.width = r.width + 'px'; np.style.height = r.height + 'px'; np.style.minHeight = '0'; np.style.zIndex = '20'; }
    setLeaving(true); useUi.setState({ npLeaving: true });
    window.setTimeout(() => nav(useUi.getState().underPath), 360);   // forward to the page beneath, as the frame's $state.go(previousState); history back could leave the site
  };
  useEffect(() => () => { useUi.setState({ npLeaving: false }); }, []);
  // Phone: pull the sheet down to minimise it, as the Zones & outputs sheet. It follows the finger
  // over the page beneath (shown at once, as when leaving) and on release goes or springs back.
  // Not from the seek bar, the volume or the lyrics sheet — those drag for themselves.
  const [dragging, setDragging] = useState(false);
  const empty = !st.title && st.status !== 'play' && !ext;
  useEffect(() => {
    const np = document.getElementById('np');
    if (!np || lyricsOn) { return; }
    const SKIP = '#np-seek, .np-volume, .np-lsheet, .np-lsheet-scrim, input, [role="slider"]';
    let startX = 0, startY = NaN, startAt = 0, dy = 0, decided = false, active = false;
    const pinned = ['position', 'top', 'left', 'width', 'height', 'minHeight', 'zIndex', 'transition', 'transform'] as const;
    // back in place: the entry animation must not run again once the drag class goes (it would slide the sheet in anew)
    const release = () => { pinned.forEach(k => { np.style[k] = ''; }); np.style.animation = 'none'; setDragging(false); useUi.setState({ npLeaving: false }); };
    const begin = () => {
      const box = np.parentElement; if (!box) { return; }
      const r = box.getBoundingClientRect();
      Object.assign(np.style, { position: 'fixed', top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px', minHeight: '0', zIndex: '20', transition: 'none' });
      setDragging(true); useUi.setState({ npLeaving: true });
    };
    const start = (e: TouchEvent) => {
      startY = NaN;
      if (e.touches.length !== 1 || !window.matchMedia(PHONE).matches || np.classList.contains('aw-np-out')) { return; }
      if ((e.target as Element).closest(SKIP)) { return; }
      const c = document.getElementById('content'); if (c && c.scrollTop > 0) { return; }
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; dy = 0; decided = false; active = false;
    };
    const move = (e: TouchEvent) => {
      if (Number.isNaN(startY)) { return; }
      const t = e.touches[0], ddx = t.clientX - startX, ddy = t.clientY - startY;
      if (!decided) {
        if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) { return; }
        decided = true;
        if (ddy <= 0 || Math.abs(ddx) > ddy) { startY = NaN; return; }   // up or sideways: not ours
        active = true; startY = t.clientY; startAt = Date.now(); begin();
      }
      if (!active) { return; }
      e.preventDefault();
      dy = Math.max(0, t.clientY - startY);
      np.style.transform = 'translateY(' + dy + 'px)';
    };
    const end = () => {
      startY = NaN;
      if (!active) { return; }
      active = false;
      const flicked = dy > 30 && dy / Math.max(1, Date.now() - startAt) > 0.45;
      if (dy > 110 || flicked) {
        np.style.transition = 'transform .22s ease-out'; np.style.transform = 'translateY(100%)';
        window.setTimeout(() => nav(useUi.getState().underPath), 220);
      } else {
        np.style.transition = 'transform .2s ease-out'; np.style.transform = '';
        window.setTimeout(release, 220);
      }
    };
    np.addEventListener('touchstart', start, { passive: true });
    np.addEventListener('touchmove', move, { passive: false });
    np.addEventListener('touchend', end); np.addEventListener('touchcancel', end);
    return () => { np.removeEventListener('touchstart', start); np.removeEventListener('touchmove', move); np.removeEventListener('touchend', end); np.removeEventListener('touchcancel', end); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empty, lyricsOn]);
  const views: View[] = ['cover', 'info', 'lyrics'];

  const topbar = (
      <div id="np-topbar">
        <button type="button" className="np-menu-btn" onClick={() => useUi.getState().toggleMenu()} aria-label="Menu" title="Menu"><Icon name="menu" /></button>
        <div className="np-topbar-left">
          <a className="np-chevron" onClick={goBack} aria-label="Back" title="Back"><Icon name="expand_more" /></a>
          {zone ? <div className="np-zone mono"><span>{zone}</span>{output ? <span className="np-zone-out">&nbsp;·&nbsp;{output}</span> : null}</div> : null}
          {sleepRunning ? <button type="button" className="np-sleep-tag" onClick={() => useModal.getState().open('sleep', { name: 'Sleep' })} title="Sleep timer"><Icon name="bedtime" /><span className="mono">SLEEP · {sleepMinutes} MIN</span></button> : null}
        </div>
        <div id="np-badge-slot">
          {bitPerfect && !empty && !ext ? <div className="np-badge"><span className="np-dot" /><span className="mono">BIT PERFECT</span></div> : null}
        </div>
      </div>
  );

  if (empty) {
    return (
      <div id="np" className={'np--empty' + (leaving ? ' aw-np-out' : '') + (dragging ? ' aw-np-drag' : '')}>
        {leaving || dragging ? <ArtStack /> : null}
        {topbar}
        <NpEmpty />
      </div>
    );
  }

  return (
    <div id="np" className={(lyricsOn ? 'np--lyrics ' : '') + (view === 'info' ? 'np--info ' : '') + (leaving ? 'aw-np-out' : '') + (dragging ? ' aw-np-drag' : '')}>
      {leaving || dragging ? <ArtStack /> : null}
      {topbar}

      <div id="np-hero">
        <div id="np-cover">{st.albumart ? <img src={albumart(st.albumart)} alt={st.album || ''} /> : null}</div>
        <div id="np-meta" className={lyricsOn ? 'np-meta--lyrics' : ''}>
          <div className="np-seg" role="tablist" aria-label="Now Playing view">
            {views.map(v => (
              <button key={v} type="button" role="tab" className={view === v ? 'active' : ''} aria-selected={view === v} onClick={() => setView(v)} disabled={v === 'lyrics' && lyricsState === 'none'}>
                {v === 'cover' ? 'Cover' : v === 'info' ? 'Info' : 'Lyrics'}
              </button>
            ))}
          </div>
          {!lyricsOn && <div className="np-eyebrow mono">{queue.length ? <span>TRACK {pos + 1} OF {queue.length}</span> : <span>NOW PLAYING</span>}</div>}
          <h1 className="np-title" title={st.title}>{st.title}</h1>
          <div className="np-byline">
            <div className="np-artist">{st.artist}</div>
            <div className="np-album">{st.album}{info.year ? <span>&nbsp;·&nbsp;{info.year}</span> : null}</div>
            <div id="np-chip-slot">
              <div className="np-quality">
                {(st.bitdepth || st.samplerate) ? (
                  <div className={'np-chip mono aw-q--' + q}>
                    {bit.n ? <span className="np-chip-num">{bit.n}</span> : null}
                    {bit.u ? <span className="np-chip-unit np-chip-unit--bit">{bit.u}</span> : null}
                    {rate.n ? <span className="np-chip-num np-chip-num--rate">{rate.n}</span> : null}
                    {rate.u ? <span className="np-chip-unit">{rate.u}</span> : null}
                  </div>
                ) : (st.bitrate ? <div className={'np-chip mono aw-q--' + q}><span className="np-chip-val">{String(st.bitrate)}</span></div> : null)}
                {fmt && !ext ? <span className="np-format mono">{fmt}</span> : null}
              </div>
              {ext ? (
                <div className={'np-external np-external--' + ext.kind}>
                  <Icon name={ext.kind === 'airplay' ? 'airplay' : ext.kind === 'analog' ? 'input' : ext.kind === 'group' ? 'speaker_group' : 'cast'} />
                  <span className="np-external__text">
                    <span className="np-external__title">{ext.text}</span>
                    <span className="np-external__sub">Controls come back when the stream stops.{ext.kind === 'group' ? <> <a onClick={() => nav('/multi-room')}>Open Zones</a></> : null}</span>
                  </span>
                </div>
              ) : null}
              {!ext && view === 'cover' && st.samplerate ? (
                <div className="np-signalpath mono">
                  <span>SOURCE {signal(st)}</span>
                  {resample ? <><span className="np-arrow">→</span><span>{resample}</span></> : null}
                  {output ? <><span className="np-arrow">→</span><span className="np-node-final">{output}</span></> : null}
                </div>
              ) : null}
              {view === 'cover' && info.genre ? <div className="np-library mono"><span>{info.genre}</span></div> : null}
            </div>
          </div>
          {view === 'info' ? <InfoFace /> : null}
          {lyricsOn ? <div className="np-lyrics-host"><LyricsColumn /></div> : null}
        </div>
      </div>

      <div className="np-m-actions">
        <button type="button" className={'np-m-tile' + (fav ? ' active' : '')} onClick={() => usePlayer.getState().toggleFavourite()} title="Add to favourites"><Icon name="favorite" /></button>
        <button type="button" className="np-m-tile" title="Add to playlist" onClick={() => addToPlaylist({ uri: String(st.uri || ''), service: st.service, type: 'song', title: st.title, artist: st.artist, album: st.album, albumart: st.albumart })} disabled={!!st.disableUi}><Icon name="playlist_add" /></button>
        <button type="button" className={'np-m-tile' + (st.repeat ? ' active' : '')} onClick={() => usePlayer.getState().cycleRepeat()} title="Repeat"><Icon name={st.repeat && st.repeatSingle ? 'repeat_one' : 'repeat'} /></button>
        <button type="button" className={'np-m-tile np-m-tile--lyrics' + (lyricsOn ? ' active' : '')} onClick={toggleLyrics} disabled={lyricsState === 'none'} title="Lyrics" aria-label="Lyrics"><Icon name="lyrics" /></button>
        <button type="button" className="np-m-tile" title="More" onClick={() => { if (st.title || st.album || st.artist) { useModal.getState().open('track-actions'); } }} disabled={!!st.disableUi}><Icon name="more_horiz" /></button>
      </div>

      <div id="np-footer">
        <div id="np-seek"><SeekBar /></div>
        <div id="np-footer-row">
          <div id="np-transport">
            <button type="button" className={'btn btn-link np-fav' + (fav ? ' active' : '')} onClick={() => usePlayer.getState().toggleFavourite()} title="Add to favourites" disabled={!!st.disableUi}><Icon name="favorite" /></button>
            <Transport />
          </div>
          <div id="np-footer-right">
            {upNext.length ? (
              <div id="np-upnext">
                <button type="button" className="np-upnext-label mono" onClick={() => useUi.getState().showQueue()} title="Queue">UP NEXT</button>
                <div className="np-upnext-films">
                  {upNext.map((t, i) => (
                    <button key={t.uri + i} type="button" className="np-upnext-film" onClick={() => useQueue.getState().play(pos + 1 + i)} title={(t.name || t.title || '') + (t.artist ? ' · ' + t.artist : '')} aria-label={'Play ' + (t.name || t.title || '')}>
                      <img src={albumart(t.albumart)} alt="" />
                    </button>
                  ))}
                </div>
                <button type="button" className={'np-queue' + (queueOpen ? ' active' : '')} onClick={() => useUi.getState().toggleQueue()} title="Queue">
                  <Icon name="queue_music" />{queue.length ? <span className="np-queue__count mono">{queue.length}</span> : null}
                </button>
              </div>
            ) : null}
            <div className="np-volume"><Volume /></div>
          </div>
        </div>
      </div>

      {lyricsOn ? <div className="np-lsheet-scrim" onClick={toggleLyrics} /> : null}
      {lyricsOn ? (
        <div className="np-lsheet" ref={sheet} data-sheet>
          <button type="button" className="np-lsheet__grab" onPointerDown={drag.onPointerDown} onClick={drag.onClick} aria-label="Close lyrics" />
          <div className="np-lsheet__head">
            <div className="np-lsheet__title">{st.title}</div>
            {st.artist ? <div className="np-lsheet__artist">{st.artist}</div> : null}
          </div>
          <div className="np-lsheet__body"><LyricsColumn /></div>
        </div>
      ) : null}

      <div className="np-m-bar">
        <button type="button" className="np-m-bar__btn" onClick={() => useUi.getState().toggleQueue()} title="Queue"><Icon name="queue_music" /></button>
        <button type="button" className="np-m-bar__btn np-m-bar__btn--skip" onClick={() => usePlayer.getState().prev()} title="Previous" disabled={!!st.disableUi}><Icon name="skip_previous" /></button>
        <button type="button" className="np-m-bar__play" onClick={() => usePlayer.getState().togglePlay()} title="Play/Pause" disabled={!!st.disableUi}><Icon name={st.status === 'play' ? 'pause' : 'play_arrow'} /></button>
        <button type="button" className="np-m-bar__btn np-m-bar__btn--skip" onClick={() => usePlayer.getState().next()} title="Next" disabled={!!st.disableUi}><Icon name="skip_next" /></button>
        <button type="button" className="np-m-bar__btn" onClick={() => useUi.getState().toggleOutputs()} title="Zones & outputs"><Icon name="speaker" /></button>
      </div>
    </div>
  );
}
