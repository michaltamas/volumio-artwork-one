/**
 * The playback state, as the player pushes it, plus the clock that runs between pushes.
 *
 * `pushState` carries the seek position at that moment; while the status is `play` the store
 * advances its own elapsed time every 250 ms, exactly as the Angular player service did, and a
 * new push resets it. Everything a screen reads about the current track comes from here.
 */
import { create } from 'zustand';
import { on, emit, connected } from '../socket';
import type { PlayerState } from '../format';

const TICK = 250;

interface Favourite { favourite: boolean; service?: string; uri?: string }

interface PlayerStore {
  state: PlayerState;
  elapsedMs: number;
  favourite: Favourite;
  ready: boolean;
  // transport
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  prev: () => void;
  next: () => void;
  seekTo: (seconds: number) => void;
  shuffle: () => void;
  repeat: (repeat: boolean, single: boolean) => void;
  cycleRepeat: () => void;
  setVolume: (v: number) => void;
  volumeUp: () => void;
  volumeDown: () => void;
  toggleMute: () => void;
  toggleFavourite: () => void;
}

let timer: number | null = null;

export const usePlayer = create<PlayerStore>((set, get) => ({
  state: {},
  elapsedMs: 0,
  favourite: { favourite: false },
  ready: false,

  play: () => { const st = get().state; emit(st.volatile ? 'volatilePlay' : 'play'); },
  pause: () => emit('pause'),
  stop: () => emit('stop'),
  togglePlay: () => {
    const st = get().state;
    if (st.status === 'play') { if (st.trackType === 'webradio') { emit('stop'); } else { emit('pause'); } }
    else { get().play(); }
  },
  prev: () => emit('prev'),
  next: () => emit('next'),
  seekTo: (seconds) => { emit('seek', Math.max(0, Math.round(seconds))); setBase(seconds * 1000); set({ elapsedMs: seconds * 1000 }); },
  shuffle: () => emit('setRandom', { value: !get().state.random }),
  repeat: (repeat, single) => emit('setRepeat', { value: repeat, repeatSingle: single }),
  cycleRepeat: () => {
    const st = get().state;
    if (!st.repeat) { get().repeat(true, false); }
    else if (!st.repeatSingle) { get().repeat(true, true); }
    else { get().repeat(false, false); }
  },
  setVolume: (v) => emit('volume', Math.max(0, Math.min(100, Math.round(v)))),
  volumeUp: () => emit('volume', '+'),
  volumeDown: () => emit('volume', '-'),
  toggleMute: () => emit(get().state.mute ? 'unmute' : 'mute'),
  toggleFavourite: () => {
    const { favourite, state } = get();
    if (!state.uri) { return; }
    emit(favourite.favourite ? 'removeFromFavourites' : 'addToFavourites', { service: state.service, uri: state.uri, title: state.title, artist: state.artist, album: state.album, albumart: state.albumart });
  },
}));

function stopClock() { if (timer !== null) { window.clearInterval(timer); timer = null; } }
// The clock reads the wall, not its own ticks: a tab in the background ticks once a second, after
// a few minutes once a minute, and counted ticks fell behind the music (the seek bar on return,
// "stop after this track" taking the track's end for a skip).
let base = 0, since = 0;   // the position the player gave last, and when
const STALE_MS = 5000;     // this far past the track's end the player's word was missed (the computer slept, the connection dropped)
const setBase = (ms: number) => { base = ms; since = Date.now(); };
// where the track stands by the wall; null when the clock cannot be trusted any more
function wallMs(): number | null {
  const dur = (usePlayer.getState().state.duration || 0) * 1000;
  const now = base + (Date.now() - since);
  if (dur && now > dur + STALE_MS) { return null; }
  // the clock stops at the end: the player says what comes after
  return dur && now > dur ? dur : now;
}
function startClock() {
  stopClock();
  timer = window.setInterval(() => {
    const now = wallMs();
    if (now === null) { stopClock(); if (connected()) { emit('getState'); } return; }   // ask where it really stands, rather than sit at the end of a track long over
    usePlayer.setState({ elapsedMs: now });
  }, TICK);
}

on('pushState', (data: PlayerState) => {
  const st = { ...(data || {}) };
  st.disableUi = !!st.disableUiControls || st.service === 'analogin';
  // the last word of the clock on the state that ends here: whoever compares the two states (stop
  // after this track) reads how far the track really got, also in a tab that hardly ticks
  if (timer !== null) { const now = wallMs(); if (now !== null) { usePlayer.setState({ elapsedMs: now }); } }
  setBase(st.seek || 0);
  usePlayer.setState({ state: st, elapsedMs: (st.seek || 0), ready: true });
  if (st.status === 'play') { startClock(); } else { stopClock(); }
  // the page's own title: what plays, the way Volumio's interface does it; the tab's icon turns green while music plays
  try {
    document.title = st.title ? `${st.title}${st.artist ? ' · ' + st.artist : ''}` : 'Volumio';
    const icon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    const href = st.status === 'play' ? '/favicon-playing.svg' : '/favicon.svg';
    if (icon && icon.getAttribute('href') !== href) { icon.setAttribute('href', href); }
  } catch { /* no document */ }
});
on('urifavourites', (data: Favourite) => usePlayer.setState({ favourite: data || { favourite: false } }));

emit('getState');
