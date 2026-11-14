/**
 * The file browser's entry as a card (Music Library in its grid view, after volumio-files-*.html):
 * a folder's cover (or a glyph in a 60px box where it has none), the name on up to two lines, the
 * artist under a track's. A track's card is a shade quieter than a folder's. Opened or played by a
 * tap; the playing track toggles.
 */
import { useEffect, useState } from 'react';
import type { BrowseItem } from '../../core/store/browse';
import { albumart } from '../../core/api';
import { isRealArt } from '../../core/folderArt';
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
  // a folder's own cover (volumio-files-folder-2.html): the glyph until the art server confirms a real picture at the
  // address (without a cover it answers with its icon, see folderArt.ts), and the glyph again if the picture fails
  const [failed, setFailed] = useState(false);
  const [real, setReal] = useState(false);
  const src = !file && item.albumart && !A.iconOfArt(item.albumart) ? albumart(item.albumart) : '';
  useEffect(() => { let alive = true; setReal(false); if (src) { isRealArt(src).then(ok => { if (alive) { setReal(ok); } }); } return () => { alive = false; }; }, [src]);
  const thumb = src && real && !failed ? src : '';
  const click = () => { if (current) { usePlayer.getState().togglePlay(); } else { A.clickListItem(item, list, itemIndex); } };
  return (
    <button type="button" className={'aw-fcard' + (file ? ' aw-fcard--file' : '') + (current ? ' aw-playing' : '') + (hidden ? ' aw-hidden' : '')} style={order ? { order } : undefined} onClick={click} data-uri={String(item.uri || '')}>
      {thumb ? <img className="aw-fcard__thumb" src={thumb} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span className="aw-fcard__glyph"><Icon name={glyphOf(item)} /></span>}
      <span className="aw-fcard__text">
        <span className="aw-fcard__name">{item.title || item.name || ''}</span>
        {file && item.artist ? <span className="aw-fcard__sub">{item.artist}</span> : null}
      </span>
    </button>
  );
}
