/**
 * Keep the screen on while music plays: a phone following the lyrics, a tablet on the sofa, a display
 * that is not the player's own. A choice of this browser (a screen's own matter, not the player's):
 * localStorage `aw-screen-on`. Held only while the player plays and this page is visible.
 *
 * The Screen Wake Lock API needs a secure page, and the player serves plain http — so the usual
 * stand-in does the work: a tiny silent video (16×16, 3 KB) looping unseen, which phones treat as
 * playback that must not be interrupted by the screen lock (the NoSleep.js approach). The API is
 * used where it exists (https, localhost).
 */
import { create } from 'zustand';
import { usePlayer } from './player';

const KEY = 'aw-screen-on';
const api: any = typeof navigator !== 'undefined' ? (navigator as any).wakeLock : null;
const SRC = '/screen-on.mp4';

interface ScreenOnStore { on: boolean; held: boolean; set: (on: boolean) => void }

const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

export const useScreenOn = create<ScreenOnStore>((set) => ({
  on: read(),
  held: false,
  set: (on) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* not remembered */ } set({ on }); if (on) { prime(); } sync(); },
}));

let lock: any = null;
let video: HTMLVideoElement | null = null;
let asking = false;

function el(): HTMLVideoElement {
  if (video) { return video; }
  video = document.createElement('video');
  // not `muted`: iOS lets a muted video play unseen, but does not count it as media that keeps the
  // screen awake. The clip carries a silent audio track; the volume is 0 on top of that.
  video.loop = true; video.volume = 0; video.setAttribute('playsinline', ''); video.setAttribute('aria-hidden', 'true'); video.preload = 'auto';
  video.style.cssText = 'position:fixed;left:-20px;top:-20px;width:1px;height:1px;opacity:0;pointer-events:none;';
  video.src = SRC;
  document.body.appendChild(video);
  return video;
}
// within the tap that turns it on: a play the browser allows, so later plays are allowed too
function prime() { if (api) { return; } const v = el(); v.play().then(() => { if (!wanted()) { v.pause(); } }).catch(() => { /* allowed later, from a tap on the player */ }); }
// iOS allows media to start only inside a tap: every tap on the page is a chance to (re)start the clip when it should run
document.addEventListener('touchend', () => { if (!api && wanted() && video && video.paused) { video.play().then(() => useScreenOn.setState({ held: true })).catch(() => {}); } }, { passive: true });

const wanted = () => useScreenOn.getState().on && usePlayer.getState().state.status === 'play' && document.visibilityState === 'visible';

async function sync() {
  const want = wanted();
  if (api && typeof api.request === 'function') {
    if (want && !lock && !asking) {
      asking = true;
      try { lock = await api.request('screen'); lock.addEventListener('release', () => { lock = null; useScreenOn.setState({ held: false }); }); useScreenOn.setState({ held: true }); }
      catch { lock = null; }
      asking = false;
      if (!wanted()) { sync(); }
    } else if (!want && lock) { const l = lock; lock = null; useScreenOn.setState({ held: false }); try { await l.release(); } catch { /* gone */ } }
    return;
  }
  if (want) { const v = el(); if (v.paused) { v.play().then(() => useScreenOn.setState({ held: true })).catch(() => useScreenOn.setState({ held: false })); } }
  else if (video && !video.paused) { video.pause(); useScreenOn.setState({ held: false }); }
}

usePlayer.subscribe((p, prev) => { if (p.state.status !== prev.state.status) { sync(); } });
document.addEventListener('visibilitychange', sync);
window.addEventListener('storage', (e) => { if (e.key === KEY) { useScreenOn.setState({ on: read() }); sync(); } });
sync();
