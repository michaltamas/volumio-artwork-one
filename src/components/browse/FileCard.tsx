/**
 * The file browser's entry as a card (Music Library in its grid view, after volumio-files-*.html):
 * a glyph in a 52px box, the name on up to two lines, the artist under a track's. A track's card is
 * a shade quieter than a folder's. Opened or played by a tap; the playing track toggles.
 */
import type { BrowseItem } from '../../core/store/browse';
import { usePlayer } from '../../core/store/player';
import Icon from '../Icon';
import * as A from '../../core/browseActions';

/** the Music Library tree (NAS, USB, internal storage and the folders inside): the one place drawn as file cards */
export const isFileBrowser = (request: BrowseItem | null | undefined) => /^music-library(\/|$)/.test(String((request || {}).uri || ''));

const glyphOf = (item: BrowseItem): string => {
  const icon = item.icon || A.iconOfArt(item.albumart);   // NAS and USB name theirs in the placeholder's address
  if (icon) { return A.faIcon(icon); }
  if (item.type === 'song') { return 'music_note'; }
  return 'folder';
};

export default function FileCard({ item, list, itemIndex, hidden, order, playing, paused }: { item: BrowseItem; list: BrowseItem[]; itemIndex: number; hidden?: boolean; order?: number; playing?: boolean; paused?: boolean }) {
  const file = item.type === 'song';
  const current = (playing || paused) && file;
  const click = () => { if (current) { usePlayer.getState().togglePlay(); } else { A.clickListItem(item, list, itemIndex); } };
  return (
    <button type="button" className={'aw-fcard' + (file ? ' aw-fcard--file' : '') + (current ? ' aw-playing' : '') + (hidden ? ' aw-hidden' : '')} style={order ? { order } : undefined} onClick={click} data-uri={String(item.uri || '')}>
      <span className="aw-fcard__glyph"><Icon name={glyphOf(item)} /></span>
      <span className="aw-fcard__text">
        <span className="aw-fcard__name">{item.title || item.name || ''}</span>
        {file && item.artist ? <span className="aw-fcard__sub">{item.artist}</span> : null}
      </span>
    </button>
  );
}
