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

export interface AboutArtist { name: string; kind: string; country: string; begin: string; area: string; since: string; mbUrl: string; extract: string; description: string; url: string; thumb: string }
export interface AboutAlbum { title: string; date: string; year: string; kind: string; label: string; mbUrl: string; extract: string; description: string; url: string }
interface Wiki { extract: string; description: string; url: string; thumb: string }
interface AboutStore { artist: AboutArtist | null; album: AboutAlbum | null }

export const useAbout = create<AboutStore>(() => ({ artist: null, album: null }));

const artists: Record<string, Promise<AboutArtist | null>> = {};
const albums: Record<string, Promise<AboutAlbum | null>> = {};
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
    const w = await wiki(full.relations);
    const begin = ((a['life-span'] && a['life-span'].begin) || '').slice(0, 4);
    return { name: a.name, kind: a.type || '', country: a.country || (a.area && a.area.name) || '', begin, area: (a['begin-area'] && a['begin-area'].name) || (a.area && a.area.name) || '',
      since: begin ? (a.type === 'Group' ? 'FORMED ' : a.type === 'Person' ? 'BORN ' : 'SINCE ') + begin : '', mbUrl: 'https://musicbrainz.org/artist/' + a.id,
      extract: w ? w.extract : '', description: w ? w.description : '', url: w ? w.url : '', thumb: w ? w.thumb : '' } as AboutArtist;
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
    // the label is on a release, not on the group: the earliest official one names it
    const label = mb('release/', { query: 'rgid:' + g.id + ' AND status:official', limit: '25' }).then(dd => {
      const rs = ((dd && dd.releases) || []).filter((r: any) => r.date).sort((a: any, b: any) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      for (const r of rs) { const li = (r['label-info'] || []).find((x: any) => x.label && x.label.name); if (li) { return li.label.name; } }
      return '';
    }).catch(() => '');
    const full = await mb('release-group/' + g.id, { inc: 'url-rels' });
    const [w, lbl] = await Promise.all([wiki(full.relations), label]);
    return { title: g.title, date: g['first-release-date'] || '', year: (g['first-release-date'] || '').slice(0, 4), kind: [g['primary-type']].concat(g['secondary-types'] || []).filter(Boolean).join(' · '),
      label: lbl, mbUrl: 'https://musicbrainz.org/release-group/' + g.id, extract: w ? w.extract : '', description: w ? w.description : '', url: w ? w.url : '' } as AboutAlbum;
  }).catch(() => null);
  remember(albums, k, p);
  return p;
}

function keys(): [string, string] {
  const st: any = usePlayer.getState().state || {};
  const artist = String(st.artist || '').trim(), album = String(st.album || '').trim();
  return [artist, artist && album ? album : ''];
}
function refresh() {
  const [artist, album] = keys();
  const sig = artist + '|' + album;
  if (sig === lastKeys) { return; }
  lastKeys = sig;
  useAbout.setState({ artist: null, album: null });
  if (!artist) { return; }
  lookupArtist(artist).then(a => { if (keys()[0] === artist) { useAbout.setState({ artist: a }); } });
  if (album) { lookupAlbum(artist, album).then(a => { if (keys()[1] === album) { useAbout.setState({ album: a }); } }); }
}
usePlayer.subscribe((s, prev) => { if (s.state !== prev.state) { refresh(); } });
refresh();
