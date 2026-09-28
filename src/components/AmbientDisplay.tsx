/**
 * The ambient screen itself: what plays, on the blurred cover, with a clock. One element,
 * three layouts, the states as classes; the seek hairline and the night scrim sit outside the
 * drifting group. Mounted once in the shell; rendered while the ambient store is active.
 */
import { useEffect, useRef, useState } from 'react';
import { useAmbient } from '../core/store/ambient';
import { usePlayer } from '../core/store/player';
import { useQueue } from '../core/store/queue';
import { useSignal } from '../core/store/signal';
import { useMultiroom } from '../core/store/multiroom';
import { useTrackInfo } from '../core/store/trackInfo';
import { useSleep } from '../core/store/sleep';
import { albumart } from '../core/api';
import { signal, format, quality } from '../core/format';

const mmss = (ms: number) => { const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };

function clockNow(mode: '12' | '24'): { text: string; suffix: string } {
  const d = new Date(); let h = d.getHours(); const m = d.getMinutes();
  if (mode === '12') { const suffix = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return { text: h + ':' + (m < 10 ? '0' : '') + m, suffix }; }
  return { text: (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m, suffix: '' };
}

export default function AmbientDisplay() {
  const active = useAmbient(s => s.active);
  const settings = useAmbient(s => s.settings);
  const st = usePlayer(s => s.state);
  const elapsedMs = usePlayer(s => s.elapsedMs);
  const queue = useQueue(s => s.queue);
  const output = useSignal(s => s.output);
  const alsa = useSignal(s => s.alsa);
  const room = useMultiroom(s => { const self = s.zones.find(z => z && z.isSelf); return self ? self.name : ''; });
  const year = useTrackInfo(s => s.year);
  const sleepEnabled = useSleep(s => s.enabled), sleepEnds = useSleep(s => s.endsAt), sleepNow = useSleep(s => s.now);
  // the clock is right to the minute; a 10 s tick keeps it never more than that late, and it is
  // redrawn the moment the screen opens and whenever the settings change
  const [clock, setClock] = useState(() => clockNow(settings.clock));
  useEffect(() => {
    if (!active) { return; }
    setClock(clockNow(settings.clock));
    const t = window.setInterval(() => setClock(clockNow(settings.clock)), 10000);
    return () => window.clearInterval(t);
  }, [active, settings.clock]);
  // a track change cross-fades the cover and the text rather than snapping
  const [swapping, setSwapping] = useState(false);
  const trackKey = (st.uri || '') + '|' + (st.title || '');
  const lastKey = useRef(trackKey);
  useEffect(() => {
    if (lastKey.current === trackKey) { return; }
    lastKey.current = trackKey;
    if (!active) { return; }
    setSwapping(true);
    const t = window.setTimeout(() => setSwapping(false), 260);
    return () => window.clearTimeout(t);
  }, [trackKey, active]);
  if (!active) { return null; }

  const layout = settings.layout;
  const night = useAmbient.getState().isNight();
  const paused = st.status === 'pause';
  const stopped = !st.status || st.status === 'stop' || !st.title;
  const cover = st.albumart ? albumart(st.albumart) : '';
  const trackNo = queue.length > 1 && typeof st.position === 'number' ? '#' + (st.position + 1) : '';
  let next = '';
  { const n: any = typeof st.position === 'number' ? queue[st.position + 1] : null;
    if (n && (n.name || n.title)) { const title = n.name || n.title, artist = n.artist && n.artist !== st.artist ? n.artist : ''; next = artist ? title + ' · ' + artist : title; } }
  const playerLine = [room || 'VOLUMIO', output].filter(Boolean).join(' · ').toUpperCase();
  const signalText = signal(st), formatText = format(st);
  const bitrateText = !signalText && st.bitrate ? String(st.bitrate) : '';
  const bitPerfect = !!alsa && useSignal.getState().bitPerfect();
  const q = quality(st);
  // inside the track, in ms: nothing when stopped, never past the end
  const durMs = st.duration ? st.duration * 1000 : 0;
  const elMs = (!st.status || st.status === 'stop') ? 0 : (durMs ? Math.min(Math.max(0, elapsedMs), durMs) : Math.max(0, elapsedMs));
  const elapsed = mmss(elMs), duration = durMs ? mmss(durMs) : '';
  const playedPct = durMs ? Math.min(100, Math.max(0, elMs / durMs * 100)) : 0;
  const sleepRunning = sleepEnabled && sleepEnds > sleepNow;
  const sleepMin = sleepRunning ? Math.ceil(Math.max(0, sleepEnds - sleepNow) / 60000) : 0;
  const cls = 'aw-amb aw-amb--' + layout + (stopped ? ' is-stopped' : '') + (paused ? ' is-paused' : '') + (night ? ' is-night' : '') + (swapping ? ' is-swapping' : '');
  const clockEl = <>{clock.text}{clock.suffix ? <span className="aw-amb__ampm">{clock.suffix}</span> : null}</>;
  const time = (extra: string) => duration ? <div className={'aw-amb__time ' + extra + ' mono'}><span>{elapsed}</span><span className="aw-amb__slash">/</span><span className="aw-amb__total">{duration}</span></div> : null;

  return (
    <div className={cls} role="presentation">
      {!stopped && cover ? <div className="aw-amb__bg"><img className="aw-amb__bg-img" src={cover} alt="" /><div className="aw-amb__veil" /></div> : null}
      <div className="aw-amb__group">
        {stopped ? (
          <div className="aw-amb__idle">
            <div className="aw-amb__clock aw-amb__clock--idle mono">{clockEl}</div>
            <div className="aw-amb__name mono">{playerLine}</div>
          </div>
        ) : (
          <div className="aw-amb__stage">
            {cover ? <img className="aw-amb__cover" src={cover} alt={st.album || ''} /> : null}
            <div className="aw-amb__text">
              {paused ? <div className="aw-amb__tag mono">PAUSED</div> : null}
              <div className="aw-amb__title">{st.title}</div>
              {st.artist ? <div className="aw-amb__artist">{st.artist}</div> : null}
              {st.album ? <div className="aw-amb__album">{st.album}{year ? <span>&nbsp;·&nbsp;{year}</span> : null}{trackNo ? <span>&nbsp;·&nbsp;{trackNo}</span> : null}</div> : null}
              <div className="aw-amb__row">
                {signalText || bitrateText ? <div className={'aw-amb__pill mono aw-q--' + q}><span className="aw-amb__pill-num">{signalText || bitrateText}</span>{formatText ? <span className="aw-amb__pill-unit">{formatText}</span> : null}</div> : null}
                {bitPerfect && !paused ? <div className="aw-amb__bp"><span className="aw-amb__dot" /><span className="mono">BIT PERFECT</span></div> : null}
                {time('aw-amb__time--inline')}
              </div>
              {time('aw-amb__time--block')}
              <div className="aw-amb__line mono">
                {/* the spaces between the spans are the template's own: the line is a block of inline text */}
                {signalText || bitrateText ? <span>{signalText || bitrateText}</span> : null}{' '}
                {formatText ? <span>· {formatText}</span> : null}{' '}
                {duration ? <span className="aw-amb__line-time">· {elapsed} / {duration}</span> : null}
              </div>
              {next ? <div className="aw-amb__next"><div className="aw-amb__next-eyebrow mono">NEXT</div><div className="aw-amb__next-title">{next}</div></div> : null}
            </div>
          </div>
        )}
        {!stopped ? <div className="aw-amb__clock mono">{clockEl}</div> : null}
        {!stopped ? <div className="aw-amb__name aw-amb__name--corner mono">{playerLine}</div> : null}
        {sleepRunning && !stopped ? <div className="aw-amb__sleep"><span className="material-symbols-rounded">bedtime</span><span className="mono">SLEEP · {sleepMin} MIN</span></div> : null}
      </div>
      {night && !stopped ? <div className="aw-amb__night" /> : null}
      {!stopped && duration ? <div className="aw-amb__seek"><div className="aw-amb__seek-fill" style={{ width: playedPct + '%' }} /></div> : null}
      {!stopped && duration ? <div className="aw-amb__times mono"><span>{elapsed}</span><span>{duration}</span></div> : null}
    </div>
  );
}
