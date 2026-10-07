/**
 * The settings the player keeps for every screen (the Artwork One Companion plugin): the theme,
 * the ambient display, the pins. Asked for when the socket comes up, followed on every push,
 * written back on change. Without the plugin nothing answers and the browser remembers for itself.
 *
 *   callMethod <plugin> getSettings {}    -> pushArtworkSettings (to us)
 *   callMethod <plugin> setSettings {...} -> pushArtworkSettings (to all)
 * <plugin> is user_interface/artwork_one (the store plugin, which holds the interface too) or
 * miscellanea/artwork_companion (the script install's companion). Both are asked at start;
 * the answer names its plugin (`plugin`, from the store plugin) and that one is written to.
 */
import { create } from 'zustand';
import socket, { on, emit } from '../socket';
import { useTheme, type ThemeMode } from './theme';
import { usePins, readPins } from './pins';
import { useAmbient } from './ambient';

const ENDPOINTS = ['user_interface/artwork_one', 'miscellanea/artwork_companion'];
let endpoint = ENDPOINTS[0];

export interface AmbientSettings { on: boolean; delay: number; layout: 'cover' | 'clock' | 'bleed'; clock: '12' | '24'; night: boolean; nightFrom: string; nightTo: string }
interface Settings { version?: number; plugin?: string; theme?: ThemeMode; ambient?: Partial<AmbientSettings>; pins?: any[] }

interface CompanionStore {
  available: boolean;
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  ask: () => void;
}

export const useCompanion = create<CompanionStore>((_set, get) => ({
  available: false,
  settings: {},
  set: (patch) => { if (!get().available) { return; } emit('callMethod', { endpoint, method: 'setSettings', data: patch }); },
  ask: () => ENDPOINTS.forEach((e) => emit('callMethod', { endpoint: e, method: 'getSettings', data: {} })),
}));

on('pushArtworkSettings', (data: Settings) => {
  if (!data || typeof data !== 'object') { return; }
  // the store plugin names itself; an unnamed answer is the old companion — ignored once the store plugin has spoken
  if (data.plugin) { endpoint = data.plugin; } else if (endpoint === ENDPOINTS[0] && useCompanion.getState().settings.plugin) { return; } else { endpoint = ENDPOINTS[1]; }
  useCompanion.setState({ available: true, settings: data });
  // one theme for the whole player: the browser's own pick only counts while the player has no word
  if (data.theme) { useTheme.getState().follow(data.theme, true); } else { useTheme.getState().unfollow(); }
  // the ambient display: the player's word beats the browser's copy
  if (data.ambient && typeof data.ambient === 'object') { useAmbient.getState().adopt(data.ambient); } else if (useAmbient.getState().remote) { useAmbient.getState().revert(); }
  // the pins: the player's list is the list; a change here goes back to it
  const writer = (list: any[]) => useCompanion.getState().set({ pins: list });
  if (Array.isArray(data.pins)) { usePins.getState().adopt(data.pins, writer); }
  else if (!usePins.getState().remote) { usePins.getState().adopt(readPins(), writer); }
});
socket.on('connect', () => useCompanion.getState().ask());
useCompanion.getState().ask();
