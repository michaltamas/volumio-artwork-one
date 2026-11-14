/**
 * About the artist and the record that play — for the Info face. MusicBrainz knows who they are
 * and where their Wikipedia page is (through Wikidata); Wikipedia gives the opening paragraph and
 * a picture. All CORS-open, no keys; MusicBrainz gets one request a second through one queue. A
 * name MusicBrainz is not sure about (score under 90) shows nothing. Answers are kept.
 */
import { create } from 'zustand';
import { usePlayer } from './player';

const KEEP = 40;
const MB = 'https://musicbrainz.org/ws/2/';
const MB_GAP = 1100;
const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const LB_SIMILAR = 'https://labs.api.listenbrainz.org/similar-artists/json';
const LB_ALGO = 'session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30';
const RELATED = 8;

export interface Credit { role: string; names: string[] }
export interface Related { name: string; mbid: string }
export interface AboutArtist { name: string; mbid: string; kind: string; country: string; begin: string; area: string; since: string; mbUrl: string; extract: string; description: string; url: string; thumb: string; related: Related[] }
export interface AboutAlbum { title: string; date: string; year: string; kind: string; label: string; mbUrl: string; extract: string; description: string; url: string; credits: Credit[] }
export interface AboutTrack { title: string; mbUrl: string; credits: Credit[] }
interface Wiki { extract: string; description: string; url: string; thumb: string }
interface AboutStore { artist: AboutArtist | null; album: AboutAlbum | null; track: AboutTrack | null; pending: { artist: boolean; album: boolean; track: boolean } }   // pending: a lookup under way, the Info face shows a placeholder

export const useAbout = create<AboutStore>(() => ({ artist: null, album: null, track: null, pending: { artist: false, album: false, track: false } }));

const artists: Record<string, Promise<AboutArtist | null>> = {};
const albums: Record<string, Promise<AboutAlbum | null>> = {};
const tracks: Record<string, Promise<AboutTrack | null>> = {};

// a relation's role, in words: the record's and the track's credits
const ROLE: Record<string, string> = { producer: 'Producer', engineer: 'Engineer', mix: 'Mixing', mastering: 'Mastering', recording: 'Recording', arranger: 'Arranger', orchestrator: 'Orchestrator', conductor: 'Conductor', 'performing orchestra': 'Orchestra', programming: 'Programming', remixer: 'Remix', photography: 'Photography', design: 'Design', 'art direction': 'Art direction', illustration: 'Illustration', composer: 'Composer', lyricist: 'Lyrics', writer: 'Written by', librettist: 'Libretto', vocal: 'Vocals', instrument: 'Instrument', performer: 'Performer' };
const cap = (v: string) => v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
function credits(rels: any[], max = 8): Credit[] {
  const by: Record<string, string[]> = {}; const order: string[] = [];
  (rels || []).forEach((r) => {
    const t = String(r.type || ''); const name = r.artist && r.artist.name; if (!name) { return; }
    let role = ROLE[t]; if (!role) { return; }
    // "instrument" names the instrument (guitar, piano); "vocal" the kind, when it says
    if (t === 'instrument' || (t === 'vocal' && r.attributes && r.attributes.length)) { role = cap((r.attributes || []).filter(Boolean).join(', ')) || role; }
    if (!by[role]) { by[role] = []; order.push(role); }
    if (by[role].indexOf(name) < 0) { by[role].push(name); }
  });
  return order.slice(0, max).map(role => ({ role, names: by[role].slice(0, 6) }));
}
// who people listen to alongside this artist (ListenBrainz, by the MusicBrainz id); none when the service is down
async function related(mbid: string): Promise<Related[]> {
  try {
    const d = await json(LB_SIMILAR, { artist_mbids: mbid, algorithm: LB_ALGO });
    return (Array.isArray(d) ? d : []).filter((x: any) => x && x.name && x.artist_mbid).slice(0, RELATED).map((x: any) => ({ name: String(x.name), mbid: String(x.artist_mbid) }));
  } catch { return []; }
}
const order: [Record<string, any>, string][] = [];
let mbLast = 0; let mbChain: Promise<any> = Promise.resolve();
let lastKeys = '';

// a busy server (MusicBrainz answers 503 now and then, even at one request a second) gets two more tries, after
// 1.5 and 3 seconds, so a lookup is not lost to a hiccup — one lost answer used to be kept as "nothing known"
const json = async (url: string, params: Record<string, string>, retry = 2): Promise<any> => {
  const r = await fetch(url + '?' + new URLSearchParams(params).toString(), { headers: { Accept: 'application/json' } });
  if ((r.status === 503 || r.status === 429) && retry > 0) { await new Promise(res => setTimeout(res, retry === 2 ? 1500 : 3000)); return json(url, params, retry - 1); }
  if (!r.ok) { throw new Error(String(r.status)); }
  return r.json();
};
const STALE = new Error('stale');
/** one MusicBrainz request a second, in one queue. `live` says whether the track that asked is still the one playing: a
 *  request for a track skipped past is dropped from the queue instead of holding up the current track's (eight requests
 *  a track, so three quick skips were half a minute of waiting, and the bio of the track playing came late or never) */
function mb(path: string, params: Record<string, string>, live?: () => boolean): Promise<any> {
  const run = async () => {
    if (live && !live()) { throw STALE; }
    const wait = Math.max(0, mbLast + MB_GAP - Date.now()); await new Promise(res => setTimeout(res, wait));
    if (live && !live()) { throw STALE; }
    mbLast = Date.now(); return json(MB + path, { fmt: 'json', ...params });
  };
  const p = mbChain.then(run, run);
  mbChain = p.catch(() => {});
  return p;
}
// an answer that failed (the network, a dropped request) is not kept: the next time the track plays, it is asked again
function forget(map: Record<string, any>, k: string) { delete map[k]; }
const lucene = (v: any) => '"' + String(v).replace(/["\\]/g, ' ').trim() + '"';

async function wiki(rels: any[]): Promise<Wiki | null> {
  const rel = (rels || []).find(r => r.type === 'wikidata' && r.url && r.url.resource);
  const m = rel && /\/(Q\d+)$/.exec(rel.url.resource);
  if (!m) { return null; }
  try {
    const d = await json(WIKIDATA, { action: 'wbgetentities', ids: m[1], props: 'sitelinks', sitefilter: 'enwiki', format: 'json', origin: '*' });
    const e = d && d.entities && d.entities[m[1]]; const t = e && e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title;
    return t ? summary(t) : null;
  } catch { return null; }
}
async function summary(title: string): Promise<Wiki | null> {
  try {
    const r = await fetch(WIKI_SUMMARY + encodeURIComponent(String(title).replace(/ /g, '_')));
    const d = r.ok ? await r.json() : null;
    if (!d || !d.extract) { return null; }
    return { extract: String(d.extract), description: String(d.description || ''), url: (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || '', thumb: (d.thumbnail && d.thumbnail.source) || '' };
  } catch { return null; }
}
function remember(map: Record<string, any>, k: string, v: any) { map[k] = v; order.push([map, k]); while (order.length > KEEP) { const [m, key] = order.shift()!; delete m[key]; } }

// the two names once lowercased and stripped of accents and punctuation: the same, or one letter off ("Phil Collin")
const fold = (v: string) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function near(a: string, b: string): boolean {
  const x = fold(a), y = fold(b); if (!x || !y) { return false; }
  if (x === y || x.replace(/^the /, '') === y.replace(/^the /, '')) { return true; }
  if (Math.abs(x.length - y.length) > 1) { return false; }
  let i = 0, j = 0, miss = 0;   // one edit apart
  while (i < x.length && j < y.length) { if (x[i] === y[j]) { i++; j++; continue; } if (++miss > 1) { return false; } if (x.length > y.length) { i++; } else if (y.length > x.length) { j++; } else { i++; j++; } }
  return miss + (x.length - i) + (y.length - j) <= 1;
}
function lookupArtist(name: string): Promise<AboutArtist | null> {
  if (name in artists) { return artists[name]; }
  const live = () => keys()[0] === name;
  const p = mb('artist/', { query: 'artist:' + lucene(name), limit: '1' }, live).then(async d => {
    let a = d && d.artists && d.artists[0];
    // a tag a letter off ("Phil Collin"): the phrase finds nothing, a fuzzy search does — taken when the name is one edit away
    if (!a || a.score < 90) {
      const words = fold(name).split(' ').filter(Boolean);
      if (!words.length) { return null; }
      const dd = await mb('artist/', { query: 'artist:(' + words.map(w => w.length > 3 ? w + '~' : w).join(' AND ') + ')', limit: '3' }, live);
      a = ((dd && dd.artists) || []).find((x: any) => x.score >= 90 && (near(x.name, name) || (x.aliases || []).some((al: any) => near(al.name, name))));
      if (!a) { return null; }
    }
    const full = await mb('artist/' + a.id, { inc: 'url-rels' }, live);
    const [w, rel] = await Promise.all([wiki(full.relations), related(a.id)]);
    const begin = ((a['life-span'] && a['life-span'].begin) || '').slice(0, 4);
    return { name: a.name, mbid: a.id, kind: a.type || '', country: a.country || (a.area && a.area.name) || '', begin, area: (a['begin-area'] && a['begin-area'].name) || (a.area && a.area.name) || '',
      since: begin ? (a.type === 'Group' ? 'FORMED ' : a.type === 'Person' ? 'BORN ' : 'SINCE ') + begin : '', mbUrl: 'https://musicbrainz.org/artist/' + a.id,
      extract: w ? w.extract : '', description: w ? w.description : '', url: w ? w.url : '', thumb: w ? w.thumb : '', related: rel } as AboutArtist;
  }).catch(() => { forget(artists, name); return null; });
  remember(artists, name, p);
  return p;
}
function lookupAlbum(artist: string, album: string): Promise<AboutAlbum | null> {
  const k = artist + '|' + album;
  if (k in albums) { return albums[k]; }
  const live = () => { const [a, b] = keys(); return a === artist && b === album; };
  const p = mb('release-group/', { query: 'artist:' + lucene(artist) + ' AND releasegroup:' + lucene(album) + ' AND primarytype:album', limit: '1' }, live).then(async d => {
    const g = d && d['release-groups'] && d['release-groups'][0];
    if (!g || g.score < 90) { return null; }
    // the label and the credits are on a release, not on the group: the earliest official one
    const release = mb('release/', { query: 'rgid:' + g.id + ' AND status:official', limit: '25' }, live).then(dd => {
      const rs = ((dd && dd.releases) || []).filter((r: any) => r.date).sort((a: any, b: any) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      let label = ''; for (const r of rs) { const li = (r['label-info'] || []).find((x: any) => x.label && x.label.name); if (li) { label = li.label.name; break; } }
      return { label, id: rs[0] ? rs[0].id : '' };
    }).catch(() => ({ label: '', id: '' }));
    const full = await mb('release-group/' + g.id, { inc: 'url-rels' }, live);
    const [w, rel] = await Promise.all([wiki(full.relations), release]);
    const cr = rel.id ? await mb('release/' + rel.id, { inc: 'artist-rels' }, live).then(r => credits(r.relations)).catch(() => []) : [];
    return { title: g.title, date: g['first-release-date'] || '', year: (g['first-release-date'] || '').slice(0, 4), kind: [g['primary-type']].concat(g['secondary-types'] || []).filter(Boolean).join(' · '),
      label: rel.label, mbUrl: 'https://musicbrainz.org/release-group/' + g.id, extract: w ? w.extract : '', description: w ? w.description : '', url: w ? w.url : '', credits: cr } as AboutAlbum;
  }).catch(() => { forget(albums, k); return null; });
  remember(albums, k, p);
  return p;
}

// the track: who wrote it (the work) and who plays on it (the recording)
function lookupTrack(artist: string, title: string, album: string): Promise<AboutTrack | null> {
  const k = artist + '|' + album + '|' + title;
  if (k in tracks) { return tracks[k]; }
  const q = 'recording:' + lucene(title) + ' AND artist:' + lucene(artist) + (album ? ' AND release:' + lucene(album) : '');
  const live = () => keys().join('|') === k;
  const p = mb('recording/', { query: q, limit: '1' }, live).then(async d => {
    const r = d && d.recordings && d.recordings[0];
    if (!r || r.score < 90) { return null; }
    const full = await mb('recording/' + r.id, { inc: 'artist-rels+work-rels+work-level-rels' }, live);
    const rels: any[] = (full.relations || []).slice();
    (full.relations || []).forEach((x: any) => { if (x.work && x.work.relations) { rels.push(...x.work.relations); } });
    const cr = credits(rels, 10);
    return cr.length ? { title: r.title, mbUrl: 'https://musicbrainz.org/recording/' + r.id, credits: cr } as AboutTrack : null;
  }).catch(() => { forget(tracks, k); return null; });
  remember(tracks, k, p);
  return p;
}

function keys(): [string, string, string] {
  const st: any = usePlayer.getState().state || {};
  const artist = String(st.artist || '').trim(), album = String(st.album || '').trim(), title = String(st.title || '').trim();
  return [artist, artist && album ? album : '', artist && title ? title : ''];
}
function refresh() {
  const [artist, album, title] = keys();
  const sig = artist + '|' + album + '|' + title;
  if (sig === lastKeys) { return; }
  const albumSame = lastKeys.split('|').slice(0, 2).join('|') === artist + '|' + album;
  lastKeys = sig;
  // the same record, the next track: the artist and the album stay on the screen
  const pend = (patch: Partial<AboutStore['pending']>) => useAbout.setState(s => ({ pending: { ...s.pending, ...patch } }));
  useAbout.setState(albumSame ? { track: null } : { artist: null, album: null, track: null });
  if (!artist) { pend({ artist: false, album: false, track: false }); return; }
  // the order on the one-a-second queue: the artist (the bio) first, then the track (its credits), the record last
  pend({ track: !!title });
  const trackThen = () => { if (title) { lookupTrack(artist, title, album).then(t => { if (keys()[2] === title) { useAbout.setState({ track: t }); pend({ track: false }); } }); } };
  if (!albumSame) {
    pend({ artist: true, album: !!album });
    lookupArtist(artist).then(a => {
      if (keys()[0] === artist) { useAbout.setState({ artist: a }); pend({ artist: false }); }
      if (sig !== lastKeys) { return; }   // another track by now: its own refresh asked for its things
      trackThen();
      if (album) { lookupAlbum(artist, album).then(b => { if (keys()[1] === album) { useAbout.setState({ album: b }); pend({ album: false }); } }); }
    });
  } else { trackThen(); }
}
usePlayer.subscribe((s, prev) => { if (s.state !== prev.state) { refresh(); } });
refresh();
