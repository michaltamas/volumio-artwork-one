/** The mini player (spec §5.10): identity, transport with the seek line, volume, zone, queue. */
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useSleep } from '../core/store/sleep';
import SeekBar from './SeekBar';
import Transport from './Transport';
import Volume from './Volume';
import { usePlayer } from '../core/store/player';
import { useQueue } from '../core/store/queue';
import { useMultiroom } from '../core/store/multiroom';
import { useUi } from '../core/store/ui';
import { albumart } from '../core/api';
import { quality, rateLine, formatLabel } from '../core/format';
import { useExternalSource } from '../core/external';

export default function MiniPlayer() {
  const sleepRunning = useSleep(s => s.running());
  const sleepMinutes = useSleep(s => s.minutesLeft());
  const st = usePlayer(s => s.state);
  const ready = usePlayer(s => s.ready);
  const queueLen = useQueue(s => s.queue.length);
  const zone = useMultiroom(s => s.zones.find(z => z.isSelf)?.name || '');
  const queueOpen = useUi(s => s.queueOpen);
  const ext = useExternalSource();
  const nav = useNavigate();
  const loc = useLocation();
  if (!ready) { return null; }
  const onPlayback = loc.pathname === '/playback';
  const rates = rateLine(st), fmt = formatLabel(st);
  return (
    <div id="footer-content" className={onPlayback ? 'is-hidden' : ''}>
      <div id="player-bar">
        <div className="artwork-mini">
          <div className="mini-identity">
            <div id="trackInfo-compact">
              {st.albumart ? <div className="trackInfo-album-art-wrapper"><img className="album-art" src={albumart(st.albumart)} alt={st.album || ''} onClick={() => nav('/playback')} /></div> : null}
              {st.title ? <div id="trackInfo-title" title="Song" onClick={() => nav('/playback')}>{st.title}</div> : null}
              <div id="trackInfo-artist-album" onClick={() => nav('/playback')}>{st.artist ? <span id="trackInfo-artist">{st.artist}</span> : null}</div>
              <div className={'track-info-rates aw-q--' + quality(st)}>
                {ext ? <span className="track-info-type">{ext.short}</span> : null}
                {!ext && rates ? <span className="track-info-rate">{rates}</span> : null}
                {!ext && fmt ? <span className="track-info-type">{fmt}</span> : null}
                {sleepRunning ? <span className="track-info-sleep">SLEEP {sleepMinutes} MIN</span> : null}
              </div>
            </div>
          </div>
          <div className="mini-transport"><Transport compact /></div>
          <div className="mini-right">
            <div className="mini-volume"><Volume /></div>
            <button type="button" className="mini-zone" onClick={() => useUi.getState().toggleOutputs()} title="Zones & outputs">
              <Icon name="speaker" /><span className="mini-zone-name">{zone || 'This player'}</span>
            </button>
            <button type="button" className={'btn btn-link mini-queue' + (queueOpen ? ' selected' : '')} onClick={() => useUi.getState().toggleQueue()} title="Queue">
              <Icon name="queue_music" />{queueLen ? <span className="mini-queue__count">{queueLen}</span> : null}
            </button>
          </div>
          <div className="mini-seek"><SeekBar /></div>
        </div>
      </div>
    </div>
  );
}
