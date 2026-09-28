/** The volume strip: a speaker glyph that mutes, and a thin track with an ink fill. While this
 *  browser plays the device's stream, it is the browser's own volume (the device mixer never reaches the stream). */
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { usePlayer } from '../core/store/player';
import { useLocalPlayback } from '../core/localPlayback';

export default function Volume() {
  const deviceVolume = usePlayer(s => s.state.volume ?? 0);
  const deviceMute = usePlayer(s => !!s.state.mute);
  const deviceDisabled = usePlayer(s => !!s.state.disableVolumeControl);
  const lp = useLocalPlayback();
  const local = lp.enabled && lp.mine;
  const beforeMute = useRef(100);
  const volume = local ? lp.volume : deviceVolume;
  const mute = local ? lp.volume === 0 : deviceMute;
  const disabled = local ? false : deviceDisabled;
  const [dragging, setDragging] = useState<number | null>(null);
  useEffect(() => { setDragging(null); }, [volume]);
  const shown = dragging === null ? volume : dragging;
  const commit = (v: number) => { if (local) { lp.setVolume(v); } else { usePlayer.getState().setVolume(v); } };
  const toggleMute = () => {
    if (!local) { usePlayer.getState().toggleMute(); return; }
    if (lp.volume > 0) { beforeMute.current = lp.volume; lp.setVolume(0); } else { lp.setVolume(beforeMute.current || 100); }
  };
  return (
    <div className="volume-slider">
      <button type="button" className={'btn btn-link button-mute' + (mute ? ' selected' : '')} onClick={toggleMute} disabled={disabled} title={mute ? 'Unmute' : 'Mute'}>
        <Icon name={mute ? 'volume_off' : 'volume_up'} />
      </button>
      <input type="range" min={0} max={100} step={1} value={shown} className={mute ? 'disabled' : ''} disabled={disabled} aria-label={local ? 'Browser volume' : 'Volume'}
        style={{ ['--aw-fill' as any]: shown + '%' }}
        onChange={(e) => setDragging(Number(e.target.value))}
        onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commit(Number((e.target as HTMLInputElement).value))} />
    </div>
  );
}
