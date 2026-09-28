/** The zones (multiroom devices) and the audio outputs, as the player pushes them. */
import { create } from 'zustand';
import { on, emit } from '../socket';

export interface Zone {
  id: string;
  name: string;
  host?: string;
  isSelf?: boolean;
  state?: string;
  volume?: number;
  mute?: boolean;
  title?: string;
  artist?: string;
  albumart?: string;
  [k: string]: any;
}

export interface AudioOutput {
  id: string;
  name: string;
  type?: string;
  enabled?: boolean;
  volume?: number;
  mute?: boolean;
  [k: string]: any;
}

interface MultiroomStore {
  zones: Zone[];
  outputs: AudioOutput[];
  self: () => Zone | null;
}

export const useMultiroom = create<MultiroomStore>((_set, get) => ({
  zones: [],
  outputs: [],
  self: () => get().zones.find(z => z && z.isSelf) || null,
}));

on('pushMultiRoomDevices', (data: any) => {
  const list = data && data.list ? data.list : data;
  useMultiroom.setState({ zones: Array.isArray(list) ? list : [] });
});
on('pushAudioOutputs', (data: any) => {
  const list = data && data.availableOutputs ? data.availableOutputs : data;
  useMultiroom.setState({ outputs: Array.isArray(list) ? list : [] });
});
emit('getMultiRoomDevices');
emit('getAudioOutputs');
