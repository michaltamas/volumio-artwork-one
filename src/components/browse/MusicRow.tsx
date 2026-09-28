/** A list row: play, number / cover / glyph, title · album · artist, heart, duration with a quality pill, ⋯. */
import { useRef, useState } from 'react';
import Icon from '../Icon';
import ItemMenu from './ItemMenu';
import { albumart } from '../../core/api';
import { type BrowseItem, useBrowse } from '../../core/store/browse';
import { usePlayer } from '../../core/store/player';
import { quality, signal } from '../../core/format';
import * as A from '../../core/browseActions';
import { countsText, useArtistCounts } from '../../core/artistCounts';
import { useBrowserLoading } from '../../core/localPlayback';
import Spinner from '../Spinner';

export interface RowProps { item: BrowseItem; list: BrowseItem[]; listIndex: number; itemIndex: number; hidden?: boolean; order?: number; playing?: boolean; paused?: boolean; fav?: boolean; active?: boolean; onMenuOpen?: (open: boolean) => void }

// a badge only for Hi-Res and DSD (handoff 8b); everything else stays plain
export function QualityPill({ item }: { item: BrowseItem }) {
  const q = quality(item);
  if (q !== 'hires' && q !== 'dsd') { return null; }
  const unit = String(item.trackType || '').toUpperCase();
  const num = q === 'dsd' ? unit.replace(/^DSF|^DFF/, 'DSD') : (signal(item as any) || 'HI-RES');   // a tier with no figures (Tidal's rows)
  return <div className={'item__quality mono aw-q aw-q--' + q}><span className="aw-q__num">{num}</span>{unit && unit !== num ? <span className="aw-q__unit">{unit}</span> : null}</div>;
}

export default function MusicRow({ item, list, listIndex, itemIndex, hidden, order, playing, paused, fav, active, onMenuOpen }: RowProps) {
  const req = useBrowse(s => s.request);
  const artistsPage = (req ? req.uri : '') === 'artists://';
  const rowRef = useRef<HTMLDivElement>(null);
  const browserLoading = useBrowserLoading() && !!playing && !paused;
  const [counts, setCounts] = useState('');
  // the Artists list: "7 albums · 64 tracks" under the name, asked for as the row comes into view
  useArtistCounts(rowRef, item.uri, artistsPage, c => setCounts(countsText(c)));
  const favVisible = A.showPlayButton(item) && (item.type === 'song' || item.type === 'folder-with-favourites') && (req ? req.uri : '') !== 'favourites';
  const noMenu = !A.showHamburgerMenu(item);
  // a folder of the file browser (USB, NAS, internal storage) is opened, never played from its row:
  // no play button and no number (albums://, playlists and genres keep both)
  const isDir = /^(folder|remdisk|internal-folder)$/.test(String(item.type || '')) && /^music-library(\/|$)/.test(String(item.uri || ''));
  const titleCls = (item.album && item.artist) ? 'item__title__third' : (!item.album && !item.artist) ? 'item__title__full' : 'item__title__half';
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
  // the currently playing/paused row: a tap (row or its hover play button) toggles instead of
  // restarting the same track from the top
  const isCurrentTrack = (playing || paused) && item.type === 'song';
  const rowClick = () => { if (isCurrentTrack) { usePlayer.getState().togglePlay(); } else { A.clickListItem(item, list, itemIndex); } };
  const playBtnClick = () => { if (isCurrentTrack) { usePlayer.getState().togglePlay(); } else { A.playRendered(item, list, itemIndex); } };
  return (
    <div className={'album__tracks' + (hidden ? ' aw-hidden' : '')} style={order ? { order } : undefined} ref={rowRef}>
      <div className={'music-item' + (item.type === 'title' ? ' title' : '') + (playing ? ' aw-playing' : '') + (browserLoading ? ' aw-loading' : '') + (paused ? ' aw-paused' : '') + (fav ? ' aw-fav' : '') + (active ? ' aw-active' : '') + (isDir ? ' aw-dir' : '')}
        data-uri={String(item.uri || '')} onClick={rowClick}>
        <div className={'item__play' + (!A.showPlayButton(item) || isDir ? ' hidden' : '')} onClick={stop}>
          <button type="button" className="ghost-btn play-btn" onClick={playBtnClick}><Icon name={playing ? 'pause' : 'play_arrow'} className="play-btn__icon" /></button>
        </div>
        <div className="item__number">{item.tracknumber || (itemIndex + 1)}<span className="item__number-dot">.</span>{browserLoading ? <Spinner size={16} className="aw-loading-spin" /> : null}</div>
        <div className={'item__image' + (!item.albumart && !item.icon ? ' hidden' : '')}>
          <div className={'item__albumart' + (!item.albumart ? ' hidden' : '')}><img className="item__image__img" src={albumart(item.albumart)} alt="" /></div>
          <div className={'item__albumart-icon' + (!item.icon ? ' hidden' : '')}><Icon name={A.faIcon(item.icon)} /></div>
        </div>
        <div className="item__info">
          <div className={'item__title truncate-text ' + titleCls} title={item.title || ''}>{item.title || ''} {item.tagImage ? <img className="music-card__extension tagrow" src={albumart(item.tagImage)} alt="" /> : null}</div>
          {item.album ? <div className="item__album truncate-text" title={item.album}>{item.album}</div> : null}
          {item.album && item.artist ? <div className="item__info__separator">•</div> : null}
          {item.artist ? <div className="item__artist truncate-text" title={item.artist}>{item.artist}</div> : null}
          {counts ? <div className="item__counts truncate-text">{counts}</div> : null}
        </div>
        <div className={'item__favorite' + (favVisible ? '' : ' hidden') + (item.favorite ? ' favorited' : '')} onClick={(e) => { e.stopPropagation(); A.addToFavorites(item); }}>
          <span className="item__favorite-heart"><Icon name="favorite" /></span>
        </div>
        <div className={'item__duration' + (!item.duration ? ' hidden' : '')}><QualityPill item={item} />{A.timeFormat(item.duration || 0)}</div>
        <div className={'item__actions' + (noMenu ? ' hidden' : '')} onClick={stop}>
          <ItemMenu item={item} id={`hamburgerMenuBtn-${listIndex}-${itemIndex}`} glyph={artistsPage ? 'more_horiz' : 'more_vert'} onOpenChange={onMenuOpen} />
        </div>
      </div>
    </div>
  );
}
