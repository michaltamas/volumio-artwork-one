/** The mini player (handoff 16C): the track and its heart, the transport over the seek row, volume · output · queue. */
import { useLocation, useNavigate } from 'react-router-dom';
import FavIcon from './FavIcon';
import { useSleep } from '../core/store/sleep';
import { useStopAfter } from '../core/store/stopAfter';
import SeekBar from './SeekBar';
import Transport from './Transport';
import Volume from './Volume';
import { usePlayer } from '../core/store/player';
import { useQueue } from '../core/store/queue';
import { leftOver } from '../core/useHeldTrack';
import { OutputPill, QueuePill } from './BarPills';
import { useUi } from '../core/store/ui';
import { albumart, IDLE_ART } from '../core/api';
import { quality, rateLine, formatLabel, shownTitle } from '../core/format';
import { useExternalSource } from '../core/external';

export default function MiniPlayer() {
  const sleepRunning = useSleep(s => s.running());
  const sleepMinutes = useSleep(s => s.minutesLeft());
  // a stop set after a track: 'this' for the one playing, else its title
  const stopAfter = useStopAfter(s => { if (!s.mark) { return ''; } const pos = usePlayer.getState().state.position; return s.mark.position === pos ? 'this' : (s.markedTitle() || 'a track'); });
  const live = usePlayer(s => s.state);
  const queueEmpty = useQueue(s => !s.queue.length);
  const st = leftOver(live, queueEmpty) ? { ...live, title: '', artist: '', album: '', albumart: '' } : live;
  const art = st.title ? st.albumart : IDLE_ART;   // nothing playing: Volumio's cover, not an empty spot
  const ready = usePlayer(s => s.ready);
  const fav = usePlayer(s => s.favourite.favourite);
  const queueOpen = useUi(s => s.queueOpen);
  const ext = useExternalSource();
  const nav = useNavigate();
  const loc = useLocation();
  if (!ready) { return null; }
  const onPlayback = loc.pathname === '/playback';
  const rates = st.title ? rateLine(st) : '', fmt = st.title ? formatLabel(st) : '';   // no track, no rate: not the last one's
  return (
    <div id="footer-content" className={onPlayback ? 'is-hidden' : ''}>
      <div id="player-bar">
        {/* handoff 16C: the Now Playing bar at 0.65 — the track (left), the transport over the seek row (centre), volume · output · queue (right) */}
        <div className="artwork-mini">
          {/* the whole zone opens Now Playing, the gap before the transport too — not only the cover and the words */}
          <div className="mini-identity" onClick={() => nav('/playback')}>
            <div id="trackInfo-compact">
              {art ? <div className="trackInfo-album-art-wrapper"><img className="album-art" src={albumart(art)} alt={st.album || ''} /></div> : null}
              {st.title ? <div id="trackInfo-title" title="Song">{shownTitle(st)}</div> : null}
              <div className="mini-byline">
                <div id="trackInfo-artist-album">{st.artist ? <span id="trackInfo-artist">{st.artist}</span> : null}</div>
                <div className={'track-info-rates aw-q--' + quality(st)}>
                  {ext ? <span className="track-info-type">{ext.short}</span> : null}
                  {!ext && rates ? <span className="track-info-rate">{rates}</span> : null}
                  {!ext && fmt ? <span className="track-info-type">{fmt}</span> : null}
                  {sleepRunning ? <span className="track-info-sleep">SLEEP {sleepMinutes} MIN</span> : null}
                  {stopAfter ? <span className="track-info-sleep" title={stopAfter === 'this' ? 'Stops after this track' : 'Stops after ' + stopAfter}>STOP AFTER</span> : null}
                </div>
              </div>
            </div>
            {/* the heart is the last item of the zone, after a title that shortens */}
            {st.title ? <button type="button" className={'btn btn-link mini-fav' + (fav ? ' active' : '')} onClick={(e) => { e.stopPropagation(); usePlayer.getState().toggleFavourite(); }} title={fav ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={fav} disabled={!!st.disableUi}><FavIcon on={fav} /></button> : null}
          </div>
          <div className="mini-center">
            <div className="mini-transport"><Transport compact /></div>
            <div className="mini-seek"><SeekBar /></div>
          </div>
          <div className="mini-right">
            <div className="mini-volume"><Volume /></div>
            <OutputPill />
            <QueuePill active={queueOpen} />
          </div>
        </div>
      </div>
    </div>
  );
}
