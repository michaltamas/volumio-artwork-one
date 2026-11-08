/**
 * The search page's answer, sorted out: Volumio answers with one list per source and kind
 * ("Found 20 Albums 'love'", "Tidal Albums", "Spotify Tracks"…) in the order the sources answered.
 * Here the lists are grouped by kind — Artists, Albums, Tracks, Playlists, Radio — and inside a
 * kind each source is a shelf of its own with the first few results and a "Show all 75" to open
 * the rest. The kind is read from the items (their type and uri), never from the list's title,
 * which is in the player's language.
 */
import { useEffect, useState } from 'react';
import { type BrowseList, useBrowse } from '../../core/store/browse';
import BrowseLists, { type ListsProps } from './BrowseLists';
import { norm } from './ArtistHead';

type Kind = 'artists' | 'albums' | 'tracks' | 'playlists' | 'radio' | 'other';
const ORDER: Kind[] = ['artists', 'albums', 'tracks', 'playlists', 'radio', 'other'];
const LABEL: Record<Kind, string> = { artists: 'Artists', albums: 'Albums', tracks: 'Tracks', playlists: 'Playlists', radio: 'Radio', other: 'More' };
const SHOW_GRID = 6, SHOW_LIST = 5;   // a shelf's first results: one row of tiles, five rows

function kindOf(list: BrowseList): Kind {
  const first = (list.items || [])[0];
  if (!first) { return 'other'; }
  const t = String(first.type || ''), u = String(first.uri || '').toLowerCase(), title = norm(list.title);
  if (t === 'song') { return 'tracks'; }
  if (/webradio/.test(t)) { return 'radio'; }
  // the kind sits in the uri as a segment of its own (albums://…, spotify:album:…, tidal:artist:…, soundcloud/albums@…):
  // an artist called "Various Artists" inside an album's uri is not one
  const seg = (word: string) => new RegExp('(^|[:/])' + word + 's?([:/@]|$)').test(u);
  if (t === 'playlist' || seg('playlist') || /\bplaylists?\b/.test(title)) { return 'playlists'; }
  if (seg('album') || /\balbums?\b/.test(title)) { return 'albums'; }
  if (seg('artist') || /\bartists?\b/.test(title)) { return 'artists'; }
  return 'other';
}

export default function SearchResults(props: ListsProps) {
  const { lists } = props;
  const sources = useBrowse(s => s.sources);
  const gridFor = useBrowse(s => s.gridFor);
  const stamp = useBrowse(s => s.stamp);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { setOpen({}); }, [stamp]);   // a new answer: every shelf closed again

  // the source a list came from, by its items' service (the library and the radio directory have no source entry of that name)
  const sourceName = (list: BrowseList): string => {
    const first = (list.items || [])[0]; const service = String((first && first.service) || '');
    if ((list as any).awSource) { return String((list as any).awSource); }   // the tracks found inside the playlists (browse store)
    if (service === 'mpd') { const s = sources.find(x => x.uri === 'music-library'); return s && s.name ? s.name : 'Music Library'; }
    if (service === 'webradio') { const s = sources.find(x => x.uri === 'radio'); return s && s.name ? s.name : 'Web Radio'; }
    const s = sources.find(x => x.plugin_name === service || x.service === service || (x.uri && service && String(x.uri).toLowerCase() === service.toLowerCase()));
    if (s && s.name) { return s.name; }
    const t = String(list.title || '').trim();
    return t ? t.replace(/\s+(artists?|albums?|tracks?|songs?|playlists?|users?)$/i, '') : (service ? service.charAt(0).toUpperCase() + service.slice(1) : 'Source');
  };

  const groups: Record<string, { list: BrowseList; li: number }[]> = {};
  lists.forEach((list, li) => { if (!(list.items || []).length) { return; } const k = kindOf(list); (groups[k] = groups[k] || []).push({ list, li }); });
  const kinds = ORDER.filter(k => groups[k]);
  if (!kinds.length) { return <BrowseLists {...props} />; }

  return (
    <div className="aw-found">
      {kinds.map(k => {
        const shelves = groups[k];
        const total = shelves.reduce((n, s) => n + (s.list.items || []).length, 0);
        return (
          <section className="aw-found__sec" key={k}>
            <div className="aw-found__head"><h2 className="aw-found__title">{LABEL[k]}</h2><span className="aw-found__count mono">{total}</span></div>
            {shelves.map(({ list, li }) => {
              const key = k + ':' + li, n = (list.items || []).length;
              const show = gridFor(list) ? SHOW_GRID : SHOW_LIST;
              const isOpen = !!open[key] || n <= show;
              const shown: BrowseList = { ...list, title: '', awLimit: isOpen ? undefined : show } as BrowseList;
              return (
                <div className={'aw-found__shelf' + (isOpen ? ' is-open' : '')} key={key}>
                  <div className="aw-found__shelfhead">
                    <span className="aw-found__source mono">{sourceName(list).toUpperCase()} · {n}</span>
                    {n > show ? <button type="button" className="aw-found__more" onClick={() => setOpen(o => ({ ...o, [key]: !o[key] }))}>{isOpen ? 'Show less' : 'Show all ' + n}</button> : null}
                  </div>
                  <BrowseLists {...props} lists={[shown]} base={li} />
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
