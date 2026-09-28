/** The transport (spec §5.8): shuffle · previous · play/pause · next · repeat. */
import Icon from './Icon';
import { usePlayer } from '../core/store/player';

export default function Transport({ compact }: { compact?: boolean }) {
  const st = usePlayer(s => s.state);
  const p = usePlayer.getState();
  const disabled = !!st.disableUi;
  const playing = st.status === 'play';
  const repeatGlyph = st.repeat && st.repeatSingle ? 'repeat_one' : 'repeat';
  const shuffle = <button key="shuffle" type="button" id="shuffle-button" className={'btn btn-link player-action-shuffle' + (st.random ? ' active' : '')} onClick={p.shuffle} title="Shuffle" disabled={disabled}><Icon name="shuffle" /></button>;
  const repeat = <button key="repeat" type="button" className={'btn btn-link repeat-button' + (st.repeat ? ' active' : '')} onClick={p.cycleRepeat} title="Repeat" disabled={disabled}><Icon name={repeatGlyph} /></button>;
  const prev = <button key="prev" type="button" id="prev-button" className="btn btn-link" onClick={p.prev} title="Previous track" disabled={disabled}><Icon name="skip_previous" /></button>;
  const play = <button key="play" type="button" className={'btn btn-link playPause' + (playing ? ' active' : ' play')} onClick={p.togglePlay} title={playing ? 'Pause' : 'Play'} disabled={disabled}><Icon name={playing ? (st.trackType === 'webradio' ? 'stop' : 'pause') : 'play_arrow'} /></button>;
  const next = <button key="next" type="button" id="next-button" className="btn btn-link" onClick={p.next} title="Next track" disabled={disabled}><Icon name="skip_next" /></button>;
  // the mini player reads shuffle · prev · play · next · repeat; Now Playing repeat · prev · play · next · shuffle
  const order = compact ? [shuffle, prev, play, next, repeat] : [repeat, prev, play, next, shuffle];
  return <div id="playerButtons" className={compact ? 'footer-control' : 'mobile-playback'}>{order}</div>;
}
