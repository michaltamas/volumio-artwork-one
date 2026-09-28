/** The queue as the player pushes it, and the ways to change it. */
import { create } from 'zustand';
import { on, emit } from '../socket';

export interface QueueItem {
  uri: string;
  service?: string;
  name?: string;
  title?: string;
  artist?: string;
  album?: string;
  albumart?: string;
  duration?: number;
  samplerate?: string;
  bitdepth?: string;
  trackType?: string;
  [k: string]: any;
}

interface QueueStore {
  queue: QueueItem[];
  play: (index: number) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  clear: () => void;
  addToQueue: (item: any) => void;
  playNext: (item: any) => void;
  saveAsPlaylist: (name: string) => void;
}

export const useQueue = create<QueueStore>(() => ({
  queue: [],
  play: (index) => emit('play', { value: index }),
  remove: (index) => emit('removeFromQueue', { value: index }),
  move: (from, to) => emit('moveQueue', { from, to }),
  clear: () => emit('clearQueue'),
  addToQueue: (item) => emit('addToQueue', item),
  playNext: (item) => emit('playNext', item),
  saveAsPlaylist: (name) => emit('saveQueueToPlaylist', { name }),
}));

on('pushQueue', (data: QueueItem[]) => useQueue.setState({ queue: Array.isArray(data) ? data : [] }));
emit('getQueue');
