/**
 * Zones & outputs: the multiroom devices merged with the audio outputs, the way Volumio's own
 * audio-outputs service does it — this device, the groups (a leader and its children), and
 * what is left to group.
 */
import { create } from 'zustand';
import { emit } from '../socket';
import { useMultiroom } from './multiroom';
import { usePlayer } from './player';

export interface Output {
  id: string;
  name: string;
  type?: string;
  host?: string;
  isSelf?: boolean;
  plugin?: string;
  leader?: string | null;
  enabled?: boolean;
  available?: boolean;
  groupable?: boolean;
  volumeAvailable?: boolean;
  state?: { status?: string; volume?: number; mute?: boolean; albumart?: string; artist?: string; track?: string; title?: string; [k: string]: any };
  [k: string]: any;
}

export interface Group { leader: Output; children: Output[] }

interface OutputsStore {
  outputs: Output[];
  thisOutput: Output | null;
  groups: Group[];
  groupable: () => Output[];
  available: () => Output[];
  enabled: () => Output[];
  hasLeader: () => boolean;
  enable: (id: string) => void;
  disable: (id: string) => void;
  removeAll: () => void;
  play: (o: Output) => void;
  pause: (o: Output) => void;
  setVolume: (o: Output, volume: number) => void;
  toggleMute: (o: Output) => void;
}

export const useOutputs = create<OutputsStore>((_set, get) => ({
  outputs: [],
  thisOutput: null,
  groups: [],
  groupable: () => get().outputs.filter(o => !o.isSelf && !o.enabled && o.groupable),
  available: () => get().outputs.filter(o => !o.isSelf && !o.enabled),
  enabled: () => get().outputs.filter(o => o.available && !o.isSelf && o.enabled),
  hasLeader: () => { const t = get().thisOutput; return !!t && Object.prototype.hasOwnProperty.call(t, 'leader') && t.leader !== null && t.leader !== undefined; },
  enable: (id) => emit('enableAudioOutput', { id }),
  disable: (id) => emit('disableAudioOutput', { id }),
  removeAll: () => get().enabled().forEach(o => emit('disableAudioOutput', { id: o.id })),
  play: (o) => emit('audioOutputPlay', o),
  pause: (o) => emit('audioOutputPause', o),
  setVolume: (o, volume) => emit('setAudioOutputVolume', { id: o.id, type: o.type, host: o.host, mute: false, volume, isSelf: o.isSelf }),
  toggleMute: (o) => {
    if (o.isSelf) { usePlayer.getState().toggleMute(); return; }
    const muted = !!(o.state && o.state.mute);
    emit('setAudioOutputVolume', { id: o.id, type: o.type, host: o.host, isSelf: o.isSelf, mute: !muted, volume: o.state ? o.state.volume : 0 });
  },
}));

function merge() {
  const zones = useMultiroom.getState().zones as any[];
  const audio = useMultiroom.getState().outputs as any[];
  const out: Output[] = [];
  let self: Output | null = null;
  zones.forEach((d) => {
    const sync = audio.find(a => a.id === d.id);
    const device: Output = { ...d };
    device.groupable = !!(sync && Object.prototype.hasOwnProperty.call(sync, 'leader') && sync.plugin === 'audio_interface/multiroom');
    if (device.groupable && sync) { device.leader = sync.leader; device.enabled = sync.enabled; device.available = sync.available; }
    out.push(device);
    if (device.isSelf) { self = device; }
  });
  audio.forEach((a) => {
    if (!out.find(d => d.id === a.id) && (!self || a.id !== self.id) && a.type !== 'browser') {
      out.push({ ...a, groupable: Object.prototype.hasOwnProperty.call(a, 'leader') && a.plugin === 'audio_interface/multiroom' });
    }
  });
  const leaderIds = out.reduce<string[]>((acc, o) => { if (o.leader && o.leader !== o.id && o.enabled && acc.indexOf(o.leader) < 0) { acc.push(o.leader); } return acc; }, []);
  const groups: Group[] = leaderIds.map(l => ({ leader: out.find(o => o.id === l) as Output, children: out.filter(o => o.leader === l && o.leader !== o.id && !!o.enabled) })).filter(g => g.leader);
  useOutputs.setState({ outputs: out, thisOutput: self, groups });
}

useMultiroom.subscribe(merge);
merge();
