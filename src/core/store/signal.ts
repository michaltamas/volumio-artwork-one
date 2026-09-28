/**
 * The player's signal path, from its real playback settings.
 *
 * The state says what the track is; the output device, resampling and the mixer live in the
 * ALSA plugin's configuration, read once over the same getUiConfig/pushUiConfig path the
 * Playback Options page uses. Nothing is claimed while the settings are unknown. While the
 * browserPlayback output is on, the path ends in this browser instead: the stream's codec replaces
 * the resample step and it is never bit-perfect.
 */
import { create } from 'zustand';
import '../socket';
import { askUiConfig, onUiConfig, ALSA_PAGE } from '../uiConfig';
import { useMultiroom } from './multiroom';

// Volumio 4 keeps the playback options on the MPD page; the ALSA controller's own page is empty
const MPD_PAGE = 'music_service/mpd';

interface Alsa {
  i2s: boolean | null;
  resampling: boolean | null;
  bitdepth: string;
  samplerate: string;
  normalization: boolean | null;
  mixerType: string;
}

interface SignalStore {
  device: string;           // the player's own output device
  browser: string | null;   // the stream quality ('aac' | 'flac') while browserPlayback is on
  output: string;           // what the path ends in: the device, or this browser
  alsa: Alsa | null;
  resample: () => string;
  bitPerfect: () => boolean;
}

function flag(v: any): boolean | null {
  if (v === true || v === false) { return v; }
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) { return null; }
  if (['true', 'on', 'yes', 'enabled', '1'].indexOf(s) > -1) { return true; }
  if (['false', 'off', 'no', 'disabled', '0'].indexOf(s) > -1) { return false; }
  return null;
}
function target(v: any): string {
  const s = String(v ?? '').trim();
  if (!s || s === '*' || /native/i.test(s)) { return ''; }
  return s;
}

const STREAM_STEP: Record<string, string> = { aac: 'AAC 256K', flac: 'FLAC 24 / 48' };
const outputOf = (device: string, browser: string | null) => (browser ? 'This browser' : device);

export const useSignal = create<SignalStore>((_set, get) => ({
  device: '',
  browser: null,
  output: '',
  alsa: null,
  // the resample step; empty while unknown, so the path never claims something untrue
  resample: () => {
    const b = get().browser;
    if (b) { return STREAM_STEP[b] || 'STREAM'; }
    const a = get().alsa;
    if (!a || a.resampling === null) { return ''; }
    if (!a.resampling) { return 'NO RESAMPLE'; }
    const t = [a.bitdepth, a.samplerate].filter(Boolean).join(' / ');
    return t ? 'RESAMPLE ' + t : 'RESAMPLE';
  },
  // untouched to the DAC: no resampling, no software volume, no normalisation
  bitPerfect: () => {
    if (get().browser) { return false; }
    const a = get().alsa;
    if (!a || a.resampling === null) { return false; }
    const mixer = String(a.mixerType || '').toLowerCase();
    const softMixer = !(mixer === 'hardware' || mixer === 'none' || mixer === 'disabled');
    return a.resampling === false && !softMixer && a.normalization !== true;
  },
}));

// the playback fields are read from whichever answer carries them: the ask below, the settings
// index, or the page the user has open
onUiConfig((_page, cfg) => {
  if (!cfg) { return; }
  const found: Record<string, any> = {};
  const walk = (arr: any[]) => (arr || []).forEach((el) => {
    if (!el) { return; }
    const id = String(el.id || '');
    if (id) { const v = el.value; found[id] = (v && typeof v === 'object') ? (v.label !== undefined ? v.label : v.value) : v; }
    if (el.content) { walk(el.content); }
  });
  try { if (cfg.sections) { cfg.sections.forEach((s: any) => walk(s.content)); } if (cfg.content) { walk(cfg.content); } } catch { return; }
  // a different plugin's config: none of the playback fields are in it
  if (found.output_device === undefined && found.resampling === undefined && found.i2sid === undefined) { return; }
  const i2s = flag(found.i2s);
  const device = (i2s === true && found.i2sid) ? found.i2sid : (found.output_device || found.i2sid || '');
  const dev = device ? String(device) : useSignal.getState().device;
  useSignal.setState({
    device: dev,
    output: outputOf(dev, useSignal.getState().browser),
    alsa: {
      i2s,
      resampling: flag(found.resampling),
      bitdepth: target(found.resampling_target_bitdepth),
      samplerate: target(found.resampling_target_samplerate),
      normalization: flag(found.volume_normalization),
      mixerType: found.mixer_type ? String(found.mixer_type) : '',
    },
  });
});
askUiConfig(ALSA_PAGE).then(() => { if (!useSignal.getState().alsa) { askUiConfig(MPD_PAGE); } });

useMultiroom.subscribe((m) => {
  const o = (m.outputs as any[]).find((x) => x && x.id === 'browserPlayback');
  const browser = o && o.enabled ? String(o.quality || 'aac') : null;
  const cur = useSignal.getState();
  if (browser !== cur.browser) { useSignal.setState({ browser, output: outputOf(cur.device, browser) }); }
});
