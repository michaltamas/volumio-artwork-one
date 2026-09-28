/** Readouts derived from the playback state (spec §5.4–5.6, handoff 8a). Pure functions. */

export interface PlayerState {
  status?: 'play' | 'pause' | 'stop' | string;
  position?: number;
  title?: string;
  artist?: string;
  album?: string;
  albumart?: string;
  uri?: string;
  trackType?: string;
  seek?: number;
  duration?: number;
  samplerate?: string;
  bitdepth?: string;
  bitrate?: string | number;
  channels?: number;
  random?: boolean;
  repeat?: boolean;
  repeatSingle?: boolean;
  consume?: boolean;
  volume?: number;
  dbVolume?: number | null;
  disableVolumeControl?: boolean;
  disableUiControls?: boolean;
  mute?: boolean;
  stream?: string | boolean;
  service?: string;
  volatile?: boolean;
  updatedb?: boolean;
  [k: string]: any;
}

// "24 bit" -> {n:"24", u:"bit"}, "48 kHz" -> {n:"48", u:"kHz"}
export function splitVal(s?: string | number | null): { n: string; u: string } {
  const m = String(s ?? '').trim().match(/^([\d.]+)\s*(.*)$/);
  return m ? { n: m[1], u: m[2] } : { n: '', u: String(s ?? '') };
}

// "24/88.2" from a state's depth and rate; one of them alone if that is all there is
export function signal(st: PlayerState): string {
  const b = splitVal(st.bitdepth).n, r = splitVal(st.samplerate).n;
  return b && r ? `${b}/${r}` : (b || r || '');
}

// What kind of stream it is, for the badge's colour: radio, dsd, hires, lossless, lossy or ''
export function quality(o: any): '' | 'radio' | 'dsd' | 'hires' | 'lossless' | 'lossy' {
  const st = o || {};
  const type = String(st.trackType || '').toLowerCase();
  if (st.stream === true || /^(webradio|mywebradio)$/.test(String(st.type || '')) || type === 'webradio') { return 'radio'; }
  const rateText = String(st.samplerate || '');
  if (/dsd|dsf|dff/.test(type) || /dsd/i.test(rateText)) { return 'dsd'; }
  // a streaming service's browse rows carry only its tier (Tidal: samplerate "HiRes"); the real
  // depth/rate arrive once the track plays
  if (/^hi-?res$/i.test(rateText.trim())) { return 'hires'; }
  // a bitrate in the rate field (Spotify: "320 kbps") is a lossy stream, not 320 kHz
  if (/kbps/i.test(rateText)) { return 'lossy'; }
  const rate = parseFloat(splitVal(rateText).n) || 0;
  const bits = parseInt(splitVal(st.bitdepth).n, 10) || 0;
  if (rate > 48 || bits > 16) { return 'hires'; }
  if (/^(mp3|aac|ogg|oga|opus|m4a|wma|mp4|mpeg|mpc)$/.test(type)) { return 'lossy'; }
  if (/^(flac|alac|wav|wave|aiff|aif|ape|wv|tta|pcm)$/.test(type) || rate || bits) { return 'lossless'; }
  if (st.bitrate && !rate && !bits) { return 'lossy'; }
  return '';
}

// "FLAC", or "FLAC · QOBUZ" when it comes from a streaming service
export function format(st: PlayerState): string {
  const fmt = String(st.trackType || st.stream || '').toUpperCase();
  const svc = String(st.service || '').toUpperCase();
  if (!svc || svc === 'MPD' || svc === fmt) { return fmt; }
  return fmt ? `${fmt} · ${svc}` : svc;
}

// the mini player's "24/88.2" line: depth/rate, else whatever single figure the state has
export function rateLine(st: PlayerState): string {
  const num = (s: any) => { const m = String(s ?? '').trim().match(/^([\d.]+)/); return m ? m[1] : ''; };
  const b = num(st.bitdepth), r = num(st.samplerate);
  if (b && r) { return b + '/' + r; }
  return String(st.samplerate || st.bitdepth || st.bitrate || '').trim();
}

export function formatLabel(st: PlayerState): string {
  return st.trackType && st.trackType !== 'webradio' ? String(st.trackType).toUpperCase() : '';
}

// m:ss (or h:mm:ss) from milliseconds
export function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = (h ? (m < 10 ? '0' : '') : '') + m, ss = (r < 10 ? '0' : '') + r;
  return (h ? h + ':' : '') + mm + ':' + ss;
}

// a list's running time for its header: "46 MIN", "3 H 12 MIN" ('' when nothing has a length)
export function runtime(seconds: number): string {
  const m = Math.round((seconds || 0) / 60);
  if (m <= 0) { return ''; }
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h} H ${r} MIN` : `${h} H`) : `${m} MIN`;
}
