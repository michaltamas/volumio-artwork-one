/**
 * The player's state as a display should show it. Between two tracks Volumio reports a moment of
 * stop with no track (a tenth of a second from the library, a second or two from a streaming
 * service): that is not the end of the music, so the last track is held on the screen until a
 * stop has lasted HOLD_MS. A real stop shows after that.
 */
import { useEffect, useRef, useState } from 'react';
import { usePlayer } from './store/player';

export const HOLD_MS = 4000;

const isStopped = (s: any) => !s.status || s.status === 'stop' || !s.title;

export function useHeldTrack() {
  const live = usePlayer(s => s.state);
  const elapsedMs = usePlayer(s => s.elapsedMs);
  const stopped = isStopped(live);
  const lastPlaying = useRef(live);
  const lastElapsed = useRef(0);
  if (!stopped) { lastPlaying.current = live; lastElapsed.current = elapsedMs; }
  const [settled, setSettled] = useState(stopped);
  useEffect(() => {
    if (!stopped) { setSettled(false); return; }
    const t = window.setTimeout(() => setSettled(true), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [stopped]);
  const holding = stopped && !settled && !!lastPlaying.current.title;
  // the held track keeps the time it had rather than jumping to 0:00
  return { st: holding ? lastPlaying.current : live, elapsedMs: holding ? lastElapsed.current : elapsedMs, holding };
}
