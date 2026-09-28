/**
 * Something outside the player drives it: AirPlay, the analog input, a UPnP / other renderer
 * (disableUiControls), or this device plays as a follower in a multiroom group. The transport is
 * disabled then; Now Playing says why instead of showing a signal path, the mini player names
 * the source instead of its rates. Detected by service ids and flags, never by labels.
 */
import { usePlayer } from './store/player';
import { useOutputs } from './store/outputs';

export interface ExternalSource {
  kind: 'airplay' | 'analog' | 'group' | 'external';
  short: string;    // the mini player's line: AIRPLAY, ANALOG IN, GROUP, EXTERNAL
  text: string;     // Now Playing's pill
}

export function useExternalSource(): ExternalSource | null {
  const st = usePlayer(s => s.state);
  const follower = useOutputs(s => s.hasLeader());
  const leader = useOutputs(s => { const t = s.thisOutput; const l = t && t.leader; return l ? (s.outputs.find(o => o.id === l)?.name || '') : ''; });
  if (follower) { return { kind: 'group', short: 'GROUP', text: leader ? `Playing in sync with ${leader}` : 'Playing in sync with a group' }; }
  if (st.service === 'airplay_emulation' || String(st.trackType || '').toLowerCase() === 'airplay') { return { kind: 'airplay', short: 'AIRPLAY', text: 'AirPlay is streaming to this device' }; }
  if (st.service === 'analogin') { return { kind: 'analog', short: 'ANALOG IN', text: 'Playing from the analog input' }; }
  if (st.disableUiControls) { return { kind: 'external', short: 'EXTERNAL', text: 'Another app is streaming to this device' }; }
  return null;
}
