/**
 * What the library knows about the album that plays: its year, genre and track count, from
 * `albums://Artist/Album` over REST (a socket answer would land in the browse page). Asked once
 * per album and kept. Local music only.
 */
import { create } from 'zustand';
import { rest } from '../api';
import { usePlayer } from './player';

const KEEP = 60;
interface Entry { year: string; genre: string; tracks: number }
interface TrackInfoStore { year: string; genre: string; tracks: number }

const cache: Record<string, Entry> = {};
const order: string[] = [];
let currentKey = '';

export const useTrackInfo = create<TrackInfoStore>(() => ({ year: '', genre: '', tracks: 0 }));

function key(): string {
  const st: any = usePlayer.getState().state || {};
  if (!st.artist || !st.album) { return ''; }
  return String(st.service || '') + '|' + st.artist + '|' + st.album;
}
function show(e: Entry | null) { useTrackInfo.setState(e || { year: '', genre: '', tracks: 0 }); }
function cleanYear(v: any): string { const m = /(\d{4})/.exec(String(v || '')); return m ? m[1] : ''; }

function refresh() {
  const k = key();
  if (k === currentKey) { return; }
  currentKey = k;
  show(null);
  if (!k) { return; }
  if (cache[k]) { show(cache[k]); return; }
  const st: any = usePlayer.getState().state || {};
  if (String(st.service || '') !== 'mpd') { return; }
  const uri = 'albums://' + encodeURIComponent(st.artist) + '/' + encodeURIComponent(st.album);
  rest<any>('browse', { uri }).then(res => {
    if (!res) { return; }
    const info = (res.navigation && res.navigation.info) || {};
    const lists = (res.navigation && res.navigation.lists) || [];
    let tracks = 0; lists.forEach((l: any) => (l.items || []).forEach((it: any) => { if (it && it.type === 'song') { tracks++; } }));
    const entry: Entry = { year: cleanYear(info.year), genre: String(info.genre || '').split(';')[0].trim(), tracks };
    if (!cache[k]) { order.push(k); } cache[k] = entry;
    while (order.length > KEEP) { delete cache[order.shift()!]; }
    if (key() === k) { show(entry); }
  });
}
usePlayer.subscribe((s, prev) => { if (s.state !== prev.state) { refresh(); } });
refresh();
