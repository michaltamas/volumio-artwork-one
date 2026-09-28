/**
 * The words of the track that plays, from LRCLIB (free, open, no key, CORS open). Asked once per
 * track, 300 ms after the track settles, kept; `synced` (timestamped lines), `plain`, `none`, or
 * `loading`. Nothing is asked for web radio, or while nothing plays. Volumio's local titles often
 * carry the track number ("1 - Liberty"); that is stripped before asking.
 */
import { create } from 'zustand';
import { usePlayer } from './player';

const API = 'https://lrclib.net/api';
const CLIENT = 'ArtworkOne/3.0 (https://github.com/michaltamas/volumio-artwork-one)';
const KEEP = 50;
const LRC_LINE = /^\s*((?:\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\])+)\s*(.*)$/;
const LRC_STAMP = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export type LyricsState = 'loading' | 'synced' | 'plain' | 'none';
export interface LyricLine { t: number; text: string }
interface Entry { state: LyricsState; lines: LyricLine[]; plain: string }
interface LyricsStore extends Entry { indexAt: (ms: number) => number }

const cache: Record<string, Entry> = {};
const order: string[] = [];
let currentKey = '';
let pending: number | null = null;
const NONE: Entry = { state: 'none', lines: [], plain: '' };

export const useLyrics = create<LyricsStore>((_set, get) => ({
  ...NONE,
  // the line that plays at `ms`: the last one whose time has come, -1 before the first
  indexAt: (ms) => { const L = get().lines; let i = -1; for (let n = 0; n < L.length; n++) { if (L[n].t <= ms) { i = n; } else { break; } } return i; },
}));

export const cleanTitle = (t: any) => String(t || '').replace(/^\s*[A-Da-d]?\d{1,3}\s*[-.–]\s+/, '').trim();
function trackKey(): string {
  const st: any = usePlayer.getState().state || {};
  if (!st.title || st.status === 'stop') { return ''; }
  return [st.artist || '', cleanTitle(st.title), st.album || '', st.duration || 0].join('|');
}
function show(e: Entry) { useLyrics.setState({ state: e.state, lines: e.lines, plain: e.plain }); }
function remember(k: string, e: Entry) { if (!cache[k]) { order.push(k); } cache[k] = e; while (order.length > KEEP) { delete cache[order.shift()!]; } }

function parseLrc(text: string): LyricLine[] {
  const out: LyricLine[] = [];
  String(text).split(/\r?\n/).forEach(raw => {
    const m = LRC_LINE.exec(raw); if (!m) { return; }
    const body = m[2].trim(); let s: RegExpExecArray | null;
    LRC_STAMP.lastIndex = 0;
    while ((s = LRC_STAMP.exec(m[1])) !== null) { const frac = s[3] ? parseInt((s[3] + '00').slice(0, 3), 10) : 0; out.push({ t: (parseInt(s[1], 10) * 60 + parseInt(s[2], 10)) * 1000 + frac, text: body }); }
  });
  out.sort((a, b) => a.t - b.t);
  return out;
}
function parse(rec: any): Entry {
  if (!rec || rec.instrumental) { return NONE; }
  if (rec.syncedLyrics) { const lines = parseLrc(rec.syncedLyrics); if (lines.length) { return { state: 'synced', lines, plain: rec.plainLyrics || '' }; } }
  if (rec.plainLyrics && String(rec.plainLyrics).trim()) { return { state: 'plain', lines: [], plain: String(rec.plainLyrics).trim() }; }
  return NONE;
}
async function get(path: string, params: Record<string, string>) { const r = await fetch(API + path + '?' + new URLSearchParams(params).toString(), { headers: { 'Lrclib-Client': CLIENT } }); if (!r.ok) { throw new Error(String(r.status)); } return r.json(); }

async function fetchLyrics(k: string, st: any) {
  const params: Record<string, string> = { artist_name: st.artist || '', track_name: cleanTitle(st.title), duration: String(Math.round(st.duration)) };
  if (st.album) { params.album_name = st.album; }
  const settle = (e: Entry) => { remember(k, e); if (currentKey === k) { show(e); } };
  try {
    // the exact lookup needs an artist (400 without one): a track with none goes straight to the search
    if (!params.artist_name) { throw new Error('no artist'); }
    settle(parse(await get('/get', params)));
  } catch {
    try {
      const list = await get('/search', { artist_name: params.artist_name, track_name: params.track_name });
      const arr = Array.isArray(list) ? list : [];
      const hit = arr.find((r: any) => r.syncedLyrics) || arr.find((r: any) => r.plainLyrics) || arr[0];
      settle(hit ? parse(hit) : NONE);
    } catch { settle(NONE); }
  }
}
function schedule() {
  const k = trackKey();
  if (k === currentKey) { return; }
  if (pending) { window.clearTimeout(pending); pending = null; }
  currentKey = k;
  if (!k) { show(NONE); return; }
  if (cache[k]) { show(cache[k]); return; }
  const st: any = usePlayer.getState().state || {};
  if (st.stream === true || !st.duration) { show(NONE); return; }
  show({ state: 'loading', lines: [], plain: '' });
  pending = window.setTimeout(() => { pending = null; fetchLyrics(k, st); }, 300);
}
usePlayer.subscribe((s, prev) => { if (s.state !== prev.state) { schedule(); } });
schedule();
