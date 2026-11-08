/**
 * The keyboard shortcuts, the same four as Nova's so nobody learns a second set: Space plays or
 * pauses, the left and right arrows seek 10 seconds, up and down step the volume, M mutes.
 * Nothing fires while typing (a field, a select, editable text), with Ctrl, Alt or Meta held, while
 * another app drives the player, or when something before us already handled the key (the ambient
 * screen takes the key that wakes it). A held Space or M does not repeat. A focused button keeps
 * its own Space, a focused slider its own arrows.
 */
import { usePlayer } from './store/player';

const SEEK = 10;   // seconds, as Nova

const typing = (t: EventTarget | null) => {
  if (!(t instanceof HTMLElement)) { return false; }
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t.isContentEditable;
};
const activates = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('button, a[href], summary, [role="button"]');
const slides = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('[role="slider"], input[type="range"]');

window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) { return; }
  const p = usePlayer.getState(); const st = p.state;
  if (!p.ready || st.disableUi) { return; }
  switch (e.key) {
    case ' ': {
      if (e.repeat || activates(e.target)) { return; }
      e.preventDefault(); p.togglePlay(); break;
    }
    case 'ArrowLeft': case 'ArrowRight': {
      const dur = st.duration || 0;
      if (!dur || st.stream === true || st.trackType === 'webradio' || slides(e.target)) { return; }
      e.preventDefault();
      const to = Math.max(0, Math.min(dur, p.elapsedMs / 1000 + (e.key === 'ArrowRight' ? SEEK : -SEEK)));
      p.seekTo(Math.round(to)); break;
    }
    case 'ArrowUp': case 'ArrowDown': {
      if (st.disableVolumeControl || slides(e.target)) { return; }
      e.preventDefault();
      if (e.key === 'ArrowUp') { p.volumeUp(); } else { p.volumeDown(); }
      break;
    }
    case 'm': case 'M': {
      if (e.repeat || st.disableVolumeControl) { return; }
      p.toggleMute(); break;
    }
    default: break;
  }
});
