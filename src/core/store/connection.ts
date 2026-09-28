/**
 * The socket's health, for the "Connection lost" overlay: lost once the socket has been down for
 * more than 2 s (a blip stays silent), found again on reconnect — when the player is asked afresh
 * for what may have changed meanwhile: the state, the queue, the zones and outputs.
 */
import { create } from 'zustand';
import socket, { emit } from '../socket';

const GRACE = 2000;

interface ConnectionStore {
  lost: boolean;
  since: number;   // when the socket went down (ms), 0 while connected
}

export const useConnection = create<ConnectionStore>(() => ({ lost: false, since: 0 }));

let grace = 0;
function down() {
  if (useConnection.getState().since) { return; }
  useConnection.setState({ since: Date.now() });
  window.clearTimeout(grace);
  grace = window.setTimeout(() => { if (!socket.connected) { useConnection.setState({ lost: true }); } }, GRACE);
}
function up() {
  window.clearTimeout(grace);
  const was = useConnection.getState().since;
  useConnection.setState({ lost: false, since: 0 });
  if (was) { ['getState', 'getQueue', 'getMultiRoomDevices', 'getAudioOutputs'].forEach((e) => emit(e)); }
}

socket.on('disconnect', down);
socket.on('connect_error', down);
socket.on('reconnect_failed', down);
socket.on('connect', up);
socket.on('reconnect', up);
// the first connection never came up
window.setTimeout(() => { if (!socket.connected) { down(); } }, 3000);
