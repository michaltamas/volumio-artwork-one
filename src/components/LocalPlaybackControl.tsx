/**
 * Play in this browser, as the Zones & outputs sheet and the Zones page both show it: the switch
 * (a spinner while the player reroutes, which takes a few seconds) and the one-line status.
 */
import { useLocalPlayback } from '../core/localPlayback';
import Spinner from './Spinner';

export function LocalPlaybackSwitch() {
  const lp = useLocalPlayback();
  if (lp.pending) {
    return <span className="aw-local__busy" role="status" aria-label={lp.enabled ? 'Turning off' : 'Starting'}><Spinner size={20} className="aw-local__spin" /></span>;
  }
  return (
    <button type="button" className={'aw-switch' + (lp.enabled ? ' on' : '')} role="switch" aria-checked={lp.enabled} aria-label="Play in this browser" onClick={() => lp.toggle()}>
      <span className="aw-switch__knob" />
    </button>
  );
}

export function LocalPlaybackStatus() {
  const lp = useLocalPlayback();
  if (lp.pending) { return <>{lp.enabled ? 'Returning the music to the device…' : 'Starting the stream…'}</>; }
  if (!lp.enabled) { return <>The device goes silent while you listen here</>; }
  if (!lp.mine) { return <>Playing in another browser — the device is muted · <button type="button" className="aw-local__link" onClick={() => lp.listenHere()}>Listen here</button></>; }
  if (lp.state === 'starting' || lp.loading) { return <span className="aw-local__loading"><Spinner size={14} className="aw-local__spin" />Loading…</span>; }
  if (lp.state === 'waiting') { return <>Starts when the device plays</>; }
  if (lp.state === 'error') { return <>Could not play here · <button type="button" className="aw-local__link" onClick={() => lp.listenHere()}>Try again</button></>; }
  return <>Playing here — the device is muted</>;
}
