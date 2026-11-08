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
interface AboutStore { artist: AboutArtist | null; album: AboutAlbum | null; track: AboutTrack | null }

export const useAbout = create<AboutStore>(() => ({ artist: null, album: null, track: null }));

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

const json = async (url: string, params: Record<string, string>) => { const r = await fetch(url + '?' + new URLSearchParams(params).toString(), { headers: { Accept: 'application/json' } }); if (!r.ok) { throw new Error(String(r.status)); } return r.json(); };
function mb(path: string, params: Record<string, string>): Promise<any> {
  const run = async () => { const wait = Math.max(0, mbLast + MB_GAP - Date.now()); await new Promise(res => setTimeout(res, wait)); mbLast = Date.now(); return json(MB + path, { fmt: 'json', ...params }); };
  const p = mbChain.then(run, run);
  mbChain = p.catch(() => {});
  return p;
}
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

function lookupArtist(name: string): Promise<AboutArtist | null> {
  if (name in artists) { return artists[name]; }
  const p = mb('artist/', { query: 'artist:' + lucene(name), limit: '1' }).then(async d => {
    const a = d && d.artists && d.artists[0];
    if (!a || a.score < 90) { return null; }
    const full = await mb('artist/' + a.id, { inc: 'url-rels' });
    const [w, rel] = await Promise.all([wiki(full.relations), related(a.id)]);
    const begin = ((a['life-span'] && a['life-span'].begin) || '').slice(0, 4);
    return { name: a.name, mbid: a.id, kind: a.type || '', country: a.country || (a.area && a.area.name) || '', begin, area: (a['begin-area'] && a['begin-area'].name) || (a.area && a.area.name) || '',
      since: begin ? (a.type === 'Group' ? 'FORMED ' : a.type === 'Person' ? 'BORN ' : 'SINCE ') + begin : '', mbUrl: 'https://musicbrainz.org/artist/' + a.id,
      extract: w ? w.extract : '', description: w ? w.description : '', url: w ? w.url : '', thumb: w ? w.thumb : '', related: rel } as AboutArtist;
  }).catch(() => null);
  remember(artists, name, p);
  return p;
}
function lookupAlbum(artist: string, album: string): Promise<AboutAlbum | null> {
  const k = artist + '|' + album;
  if (k in albums) { return albums[k]; }
  const p = mb('release-group/', { query: 'artist:' + lucene(artist) + ' AND releasegroup:' + lucene(album) + ' AND primarytype:album', limit: '1' }).then(async d => {
    const g = d && d['release-groups'] && d['release-groups'][0];
    if (!g || g.score < 90) { return null; }
    // the label and the credits are on a release, not on the group: the earliest official one
    const release = mb('release/', { query: 'rgid:' + g.id + ' AND status:official', limit: '25' }).then(dd => {
      const rs = ((dd && dd.releases) || []).filter((r: any) => r.date).sort((a: any, b: any) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      let label = ''; for (const r of rs) { const li = (r['label-info'] || []).find((x: any) => x.label && x.label.name); if (li) { label = li.label.name; break; } }
      return { label, id: rs[0] ? rs[0].id : '' };
    }).catch(() => ({ label: '', id: '' }));
    const full = await mb('release-group/' + g.id, { inc: 'url-rels' });
    const [w, rel] = await Promise.all([wiki(full.relations), release]);
    const cr = rel.id ? await mb('release/' + rel.id, { inc: 'artist-rels' }).then(r => credits(r.relations)).catch(() => []) : [];
    return { title: g.title, date: g['first-release-date'] || '', year: (g['first-release-date'] || '').slice(0, 4), kind: [g['primary-type']].concat(g['secondary-types'] || []).filter(Boolean).join(' · '),
      label: rel.label, mbUrl: 'https://musicbrainz.org/release-group/' + g.id, extract: w ? w.extract : '', description: w ? w.description : '', url: w ? w.url : '', credits: cr } as AboutAlbum;
  }).catch(() => null);
  remember(albums, k, p);
  return p;
}

// the track: who wrote it (the work) and who plays on it (the recording)
function lookupTrack(artist: string, title: string, album: string): Promise<AboutTrack | null> {
  const k = artist + '|' + album + '|' + title;
  if (k in tracks) { return tracks[k]; }
  const q = 'recording:' + lucene(title) + ' AND artist:' + lucene(artist) + (album ? ' AND release:' + lucene(album) : '');
  const p = mb('recording/', { query: q, limit: '1' }).then(async d => {
    const r = d && d.recordings && d.recordings[0];
    if (!r || r.score < 90) { return null; }
    const full = await mb('recording/' + r.id, { inc: 'artist-rels+work-rels+work-level-rels' });
    const rels: any[] = (full.relations || []).slice();
    (full.relations || []).forEach((x: any) => { if (x.work && x.work.relations) { rels.push(...x.work.relations); } });
    const cr = credits(rels, 10);
    return cr.length ? { title: r.title, mbUrl: 'https://musicbrainz.org/recording/' + r.id, credits: cr } as AboutTrack : null;
  }).catch(() => null);
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
  useAbout.setState(albumSame ? { track: null } : { artist: null, album: null, track: null });
  if (!artist) { return; }
  if (!albumSame) {
    lookupArtist(artist).then(a => { if (keys()[0] === artist) { useAbout.setState({ artist: a }); } });
    if (album) { lookupAlbum(artist, album).then(a => { if (keys()[1] === album) { useAbout.setState({ album: a }); } }); }
  }
  if (title) { lookupTrack(artist, title, album).then(t => { if (keys()[2] === title) { useAbout.setState({ track: t }); } }); }
}
usePlayer.subscribe((s, prev) => { if (s.state !== prev.state) { refresh(); } });
refresh();
