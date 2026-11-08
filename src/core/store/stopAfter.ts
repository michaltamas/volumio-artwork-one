/**
 * "Stop after this track": one track in the queue is marked, and when it has played to its end the
 * player stops instead of going on. The mark is a place in the queue (position + uri); it follows
 * the track when the queue is reordered and goes away when the track leaves the queue.
 *
 * The stop is sent a moment before the end (the clock in the player store), so the next track
 * never starts; if the clock was off and the next track did start, the stop follows at once.
 * A track that ends early (a skip, Next, a tap on another row) was not played to its end: the
 * mark is dropped, nothing stops.
 */
import { create } from 'zustand';
import { emit } from '../socket';
import { usePlayer } from './player';
import { useQueue } from './queue';
import { useToasts } from './toast';

const EARLY_MS = 300;       // the stop goes out this much before the end
const ENDED_MS = 3000;      // a track that changed within this of its end ended by itself

interface Mark { position: number; uri: string }
interface StopAfterStore {
  mark: Mark | null;
  set: (position: number) => void;
  clear: () => void;
  toggle: (position: number) => void;
  isMarked: (position: number, uri?: string) => boolean;
  markedTitle: () => string;
}

const uriAt = (i: number) => { const t = useQueue.getState().queue[i]; return t ? String(t.uri || '') : ''; };

export const useStopAfter = create<StopAfterStore>((set, get) => ({
  mark: null,
  set: (position) => set({ mark: { position, uri: uriAt(position) } }),
  clear: () => set({ mark: null }),
  toggle: (position) => { if (get().isMarked(position)) { get().clear(); } else { get().set(position); } },
  isMarked: (position, uri) => { const m = get().mark; return !!m && m.position === position && (uri === undefined || m.uri === uri); },
  markedTitle: () => { const m = get().mark; const t = m ? useQueue.getState().queue[m.position] : null; return t ? String(t.name || t.title || '') : ''; },
}));

let fired = false;   // the stop for this mark went out already

function stopNow(why: string) {
  if (fired) { return; }
  fired = true;
  emit('stop');
  const title = useStopAfter.getState().markedTitle();
  useStopAfter.getState().clear();
  useToasts.getState().show('info', title ? 'Stopped after ' + title : 'Stopped', why);
}

// the current track is the marked one: stop just before its end
usePlayer.subscribe((s, prev) => {
  const m = useStopAfter.getState().mark; if (!m) { fired = false; return; }
  const st = s.state, was = prev.state;
  const pos = typeof st.position === 'number' ? st.position : -1;
  const onMark = pos === m.position && String(st.uri || '') === m.uri;
  if (s.state !== prev.state) {
    const wasPos = typeof was.position === 'number' ? was.position : -1;
    const wasOnMark = wasPos === m.position && String(was.uri || '') === m.uri;
    if (wasOnMark && !onMark) {
      // the marked track gave way to another: by its end (stop now) or by a skip (forget the mark)
      const dur = (was.duration || 0) * 1000;
      if (dur && prev.elapsedMs >= dur - ENDED_MS) { stopNow('Stop after this track'); } else { useStopAfter.getState().clear(); }
      return;
    }
    if (onMark && st.status === 'stop' && fired) { useStopAfter.getState().clear(); return; }
    if (onMark && was.status !== 'play' && st.status === 'play') { fired = false; }
    return;
  }
  // the clock ticked
  if (!onMark || st.status !== 'play') { return; }
  const dur = (st.duration || 0) * 1000;
  if (dur && s.elapsedMs >= dur - EARLY_MS) { stopNow('Stop after this track'); }
});

// the queue changed under the mark: the track moved (find it again) or left (drop the mark)
useQueue.subscribe((q) => {
  const m = useStopAfter.getState().mark; if (!m) { return; }
  const at = q.queue[m.position];
  if (at && String(at.uri || '') === m.uri) { return; }
  const i = q.queue.findIndex(t => String(t.uri || '') === m.uri);
  if (i < 0) { useStopAfter.getState().clear(); } else { useStopAfter.setState({ mark: { position: i, uri: m.uri } }); }
});
