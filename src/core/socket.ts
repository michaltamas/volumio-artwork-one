/**
 * One socket to the player, shared by every store.
 *
 * Volumio 4 runs socket.io 1.7 on the server, so the client is the matching 1.x build. The host
 * is the page's own origin on the player; in development it is the player named in
 * VITE_VOLUMIO_HOST. Listeners are plain functions; a store subscribes once at module load.
 */
import io from 'socket.io-client';

// the player: named in VITE_VOLUMIO_HOST in development; on the player it is always the page's own
// origin — port 80 in a browser, but localhost:3000 on the display the player drives (kiosk), where
// nothing listens on port 80: sending the socket to port 80 there left the display "Connection lost"
function playerHost(): string {
  const env = import.meta.env.VITE_VOLUMIO_HOST as string | undefined;
  return env || '';
}
export const HOST: string = playerHost();

type Handler = (data: any) => void;

const socket = io(HOST || undefined, { timeout: 5000, transports: ['websocket', 'polling'] });

// the player switched the interface it serves (Settings → Appearance): load the new one, as the
// theme always did — without it the old interface stays until the user refreshes
socket.on('reloadUi', () => { window.location.reload(); });

export function on(event: string, handler: Handler): () => void {
  socket.on(event, handler);
  return () => socket.off(event, handler);
}

export function emit(event: string, data?: any): void {
  socket.emit(event, data);
}

export function connected(): boolean {
  return socket.connected;
}

// ask once for an answer that arrives as another event
export function ask<T = any>(event: string, data: any, answer: string, timeoutMs = 4000): Promise<T | null> {
  return new Promise((resolve) => {
    let done = false;
    const off = on(answer, (d) => { if (done) { return; } done = true; off(); resolve(d as T); });
    emit(event, data);
    setTimeout(() => { if (!done) { done = true; off(); resolve(null); } }, timeoutMs);
  });
}

export default socket;
