/**
 * Play in this browser: the player's `browserPlayback` output (a plugin encodes what the device
 * plays into HLS at /stream/stream.m3u8 and silences the device). This browser plays it only when
 * it asked for it (`mine`) or chose "Listen here"; it follows the device: paused when the device
 * is not playing, back at the live edge when it plays again.
 */
import { create } from 'zustand';
import { emit, HOST } from './socket';
import { useMultiroom } from './store/multiroom';
import { usePlayer } from './store/player';
import { quietSuccess } from './store/toast';
import { albumart } from './api';

export const STREAM_URL = (HOST || window.location.origin) + '/stream/stream.m3u8';
const OUTPUT_ID = 'browserPlayback';
const VOL_KEY = 'aw-local-volume';

type LocalState = 'idle' | 'waiting' | 'starting' | 'playing' | 'error';
interface LocalPlaybackStore {
  available: boolean; enabled: boolean; mine: boolean; state: LocalState; volume: number;
  pending: boolean;   // asked to switch, the player has not answered yet (switching takes a few seconds)
  loading: boolean;   // this browser waits for the stream to carry the current track (after a start or a track change)
  toggle: () => void; listenHere: () => void; stopHere: () => void; setVolume: (v: number) => void;
}

const readVol = () => { try { const v = Number(localStorage.getItem(VOL_KEY)); return Number.isFinite(v) && v > 0 ? Math.min(100, v) : 100; } catch { return 100; } };

let audio: HTMLAudioElement | null = null;
let hls: any = null;
let retries = 0;
let pendingTimer = 0;

function el(): HTMLAudioElement {
  if (!audio) { audio = new Audio(); audio.setAttribute('playsinline', ''); audio.volume = useLocalPlayback.getState().volume / 100; }
  return audio;
}
// Native HLS only in Apple's browsers (Safari, iOS — where it also keeps playing on the lock
// screen). Chromium answers canPlayType "maybe" and then fails the source (MEDIA_ERR 4).
const appleNative = () => /Apple/.test(navigator.vendor || '') && el().canPlayType('application/vnd.apple.mpegurl') !== '';
let forceHlsJs = false;   // native failed once in this browser: hls.js from now on

function detach() {
  if (hls) { hls.destroy(); hls = null; }
  window.clearTimeout(muteTimer);
  useLocalPlayback.setState({ loading: false });
  if (audio) { audio.onerror = null; audio.muted = false; audio.pause(); audio.removeAttribute('src'); audio.load(); }
}

function failed() {
  if (retries < 3) { retries += 1; window.setTimeout(() => { if (wantsAudio()) { attach(); } }, 1500); return; }
  detach(); useLocalPlayback.setState({ state: 'error' });
}

async function attach() {
  const a = el();
  detach();
  useLocalPlayback.setState({ state: 'starting' });
  if (appleNative() && !forceHlsJs) {
    a.onerror = () => { forceHlsJs = true; failed(); };
    a.src = STREAM_URL + '?t=' + Date.now();
  } else {
    const { default: Hls } = await import('hls.js');
    if (!Hls.isSupported()) { useLocalPlayback.setState({ state: 'error' }); return; }
    // one segment (1 s) behind the live edge instead of three; when it drifts further (a stall),
    // play slightly faster to catch up rather than stay late
    hls = new Hls({ liveSyncDurationCount: 1, liveMaxLatencyDurationCount: 4, maxLiveSyncPlaybackRate: 1.5, lowLatencyMode: false, backBufferLength: 0 });
    hls.on(Hls.Events.ERROR, (_e: any, data: any) => { if (data.fatal) { failed(); } });
    hls.loadSource(STREAM_URL);
    hls.attachMedia(a);
  }
  try { await a.play(); } catch { useLocalPlayback.setState({ state: 'error' }); return; }
  // a track change passes through stop and restarts the stream: its live edge still ends in the old
  // track (a segment plus the second this browser stays behind)
  if (Date.now() - trackChangedAt < 5000) { muteFor(hls ? 2200 : 3500); }   // native HLS (Safari) stays ~3 segments behind
  // "playing" once time actually moves, not when play() merely resolves
  a.addEventListener('timeupdate', function onTime() {
    if (a.currentTime > 0) { a.removeEventListener('timeupdate', onTime); retries = 0; if (useLocalPlayback.getState().state === 'starting') { useLocalPlayback.setState({ state: 'playing' }); } }
  });
}

// for tests and debugging: what the hidden <audio> element is doing
export function audioMuted() { return audio ? audio.muted : null; }
export function audioStatus() {
  if (!audio) { return null; }
  const end = audio.seekable.length ? audio.seekable.end(audio.seekable.length - 1) : 0;
  const buffered = audio.buffered.length ? audio.buffered.end(audio.buffered.length - 1) - audio.currentTime : 0;
  // behind: how far the listener is behind the newest audio in the playlist (the stream's own live edge)
  return { time: audio.currentTime, paused: audio.paused, ready: audio.readyState, error: audio.error ? audio.error.code : 0, engine: hls ? 'hls.js' : (audio.src ? 'native' : 'none'),
    behind: Math.round((end - audio.currentTime) * 10) / 10, buffered: Math.round(buffered * 10) / 10, hlsLatency: hls && hls.latency ? Math.round(hls.latency * 10) / 10 : null };
}

// The device changed track. Whatever is buffered here, and the newest segment itself, still carries
// the old one: silence it at once, jump to the live edge, and let the sound back in once playback
// has moved past the audio that was already in the pipeline (the lag behind the device, measured).
let muteTimer = 0;
let trackChangedAt = 0;

// silence for `ms`: the old track's tail still in the stream must not be heard
function muteFor(ms: number) {
  if (!audio) { return; }
  audio.muted = true;
  useLocalPlayback.setState({ loading: true });
  window.clearTimeout(muteTimer);
  muteTimer = window.setTimeout(() => { if (audio) { audio.muted = false; } useLocalPlayback.setState({ loading: false }); }, ms);
}
function switchTrack() {
  if (!audio || audio.paused) { return; }
  const lag = (hls && typeof hls.latency === 'number' ? hls.latency : 3) + 1.2;   // + the segment being encoded
  const startedAt = audio.currentTime;
  const target = hls && typeof hls.liveSyncPosition === 'number' ? hls.liveSyncPosition : (audio.seekable.length ? audio.seekable.end(audio.seekable.length - 1) - 1 : 0);
  if (target > audio.currentTime + 0.3) { audio.currentTime = target; }
  const skipped = Math.max(0, audio.currentTime - startedAt);
  muteFor(Math.max(300, (lag - skipped) * 1000));
}

const wantsAudio = () => { const s = useLocalPlayback.getState(); return s.enabled && s.mine; };

// react to the output and to the device's status
function sync() {
  const s = useLocalPlayback.getState();
  const playing = usePlayer.getState().state.status === 'play';
  if (!s.enabled || !s.mine) { detach(); if (s.state !== 'idle' && !(s.state === 'error' && s.enabled)) { useLocalPlayback.setState({ state: 'idle' }); } return; }
  if (!playing) { if (audio) { audio.pause(); } useLocalPlayback.setState({ state: 'waiting' }); return; }
  if (s.state === 'waiting' || s.state === 'idle') { attach(); }   // (re)start at the live edge
}

export const useLocalPlayback = create<LocalPlaybackStore>((set, get) => ({
  available: false, enabled: false, mine: false, state: 'idle', volume: readVol(), pending: false, loading: false,
  toggle: () => {
    if (get().pending) { return; }
    quietSuccess(20000);   // the player's "restarted" toast for the chain change
    // until the output flips; a switch the player refused (its error toast says why) ends after 30 s
    set({ pending: true });
    window.clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(() => set({ pending: false }), 30000);
    if (get().enabled) { emit('disableAudioOutput', { id: OUTPUT_ID }); set({ mine: false }); return; }
    el().play().catch(() => { /* unlocks audio on iOS within the click */ });
    set({ mine: true });
    emit('enableAudioOutput', { id: OUTPUT_ID });
  },
  listenHere: () => { el().play().catch(() => {}); set({ mine: true, state: 'idle' }); sync(); },
  stopHere: () => { set({ mine: false }); sync(); },
  setVolume: (v) => { const n = Math.max(0, Math.min(100, v)); set({ volume: n }); if (audio) { audio.volume = n / 100; } try { localStorage.setItem(VOL_KEY, String(n)); } catch { /* not remembered */ } },
}));

useLocalPlayback.subscribe((s, prev) => { if (s.enabled !== prev.enabled || s.mine !== prev.mine) { mediaSession(); } });

useMultiroom.subscribe((m) => {
  const o = (m.outputs as any[]).find((x) => x && x.id === OUTPUT_ID);
  const next = { available: !!(o && o.available !== false), enabled: !!(o && o.enabled) };
  const cur = useLocalPlayback.getState();
  if (next.available !== cur.available || next.enabled !== cur.enabled) {
    if (next.enabled !== cur.enabled) { quietSuccess(10000); window.clearTimeout(pendingTimer); useLocalPlayback.setState({ pending: false }); }   // switched — here, elsewhere, or by the idle guard
    useLocalPlayback.setState(next.enabled ? next : { ...next, mine: false });
    sync();
  }
});
/**
 * The phone's lock screen and control centre (Media Session): what the device plays — title, artist,
 * album, cover, the track's length and position — and its buttons drive the device: previous / next
 * instead of ±10 s, play and pause on the player. Only while this browser plays the stream.
 */
const ms: any = typeof navigator !== 'undefined' ? (navigator as any).mediaSession : null;
let msWired = false;
function mediaSession() {
  if (!ms) { return; }
  const st: any = usePlayer.getState().state || {};
  if (!wantsAudio() || !st.title) {
    if (msWired) { ms.metadata = null; ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'].forEach((a) => { try { ms.setActionHandler(a, null); } catch { /* unsupported */ } }); msWired = false; }
    return;
  }
  const art = st.albumart ? new URL(albumart(st.albumart), window.location.origin).href : '';
  try {
    ms.metadata = new (window as any).MediaMetadata({ title: st.title || '', artist: st.artist || '', album: st.album || '', artwork: art ? [{ src: art, sizes: '512x512' }] : [] });
  } catch { /* MediaMetadata unsupported */ }
  ms.playbackState = st.status === 'play' ? 'playing' : 'paused';
  const duration = Number(st.duration) || 0;
  if (duration > 0 && typeof ms.setPositionState === 'function') {
    const position = Math.min(duration, Math.max(0, (Number(st.seek) || 0) / 1000));
    try { ms.setPositionState({ duration, position, playbackRate: 1 }); } catch { /* bad values from a live stream */ }
  }
  if (!msWired) {
    const set = (a: string, fn: ((d: any) => void) | null) => { try { ms.setActionHandler(a, fn); } catch { /* unsupported */ } };
    set('play', () => { if (usePlayer.getState().state.status !== 'play') { usePlayer.getState().togglePlay(); } });
    set('pause', () => { if (usePlayer.getState().state.status === 'play') { usePlayer.getState().togglePlay(); } });
    set('previoustrack', () => usePlayer.getState().prev());
    set('nexttrack', () => usePlayer.getState().next());
    set('seekto', (d: any) => { if (d && typeof d.seekTime === 'number') { usePlayer.getState().seekTo(d.seekTime); } });
    set('seekbackward', null); set('seekforward', null);   // previous / next take their place
    msWired = true;
  }
}

usePlayer.subscribe((p, prev) => {
  if (p.state !== prev.state) { mediaSession(); }
  const changed = p.state.uri !== prev.state.uri || p.state.title !== prev.state.title;
  if (changed) { trackChangedAt = Date.now(); }
  if (p.state.status !== prev.state.status) { sync(); }
  else if (changed && wantsAudio()) { switchTrack(); }
});

/** The playing row's bars would lie while this browser still waits for the stream: a spinner instead. */
export const useBrowserLoading = () => useLocalPlayback((s) => s.enabled && s.mine && (s.loading || s.state === 'starting'));
