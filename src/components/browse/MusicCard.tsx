/** A grid tile: cover (or glyph), hover overlay with play / menu / heart, label and meta. */
import { useRef, useState } from 'react';
import Icon from '../Icon';
import ItemMenu from './ItemMenu';
import { albumart } from '../../core/api';
import { type BrowseItem, useBrowse } from '../../core/store/browse';
import * as A from '../../core/browseActions';
import { countText, useArtistCounts } from '../../core/artistCounts';

export interface CardProps { item: BrowseItem; list: BrowseItem[]; listIndex: number; itemIndex: number; hidden?: boolean; order?: number; artistCounts?: boolean; onMenuOpen?: (open: boolean) => void }

export default function MusicCard({ item, list, listIndex, itemIndex, hidden, order, artistCounts, onMenuOpen }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);   // the tile is raised over its later siblings while its menu is open
  const req = useBrowse(s => s.request);
  const ref = useRef<HTMLDivElement>(null);
  const [countMeta, setCountMeta] = useState('');
  // the Artists grid: "7 albums" under the name, asked for as the tile comes into view
  useArtistCounts(ref, item.uri, !!artistCounts && !item.meta, c => setCountMeta(countText(c)));
  const favVisible = A.showPlayButton(item) && (item.type === 'song' || item.type === 'folder-with-favourites') && (req ? req.uri : '') !== 'favourites';
  const noMenu = !A.showHamburgerMenu(item);
  return (
    <div className={'music-card__wrapper' + (hidden ? ' aw-hidden' : '') + (menuOpen ? ' is-menu-open' : '')} ref={ref} style={order ? { order } : undefined}>
      <div className="music-card" onClick={() => A.clickListItem(item, list, itemIndex)}>
        <div className="music-card__header">
          <img className={'music-card__img' + (!item.albumart ? ' hidden' : '')} src={albumart(item.albumart)} alt="" />
          <div className={'music-card__img-icon' + (!item.icon ? ' hidden' : '')}><Icon name={A.faIcon(item.icon)} /></div>
          <div className="music-card__overlay">
            <div className="meta__genre">{item.genre || ''}</div>
            <div className={'meta__actions' + (noMenu ? ' hidden' : '')} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
              <ItemMenu item={item} id={`hamburgerMenuBtn-${listIndex}-${itemIndex}`} onOpenChange={(o) => { setMenuOpen(o); if (onMenuOpen) { onMenuOpen(o); } }} />
            </div>
            <div className={'meta__play' + (!A.showPlayButton(item) ? ' hidden' : '')} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
              <button type="button" className="ghost-btn play-btn" onClick={() => A.playRendered(item, list, itemIndex)}><Icon name="play_arrow" className="play-btn__icon" /></button>
            </div>
            <div className={'meta__favorite' + (favVisible ? '' : ' hidden') + (item.favorite ? ' favorited' : '')} onClick={(e) => { e.stopPropagation(); A.addToFavorites(item); }}>
              <span className="meta__favorite-heart"><Icon name="favorite" /></span>
            </div>
          </div>
        </div>
        <div className="music-card__info">
          <div className={'music-card__label' + (item.qualityDescription === 'HI_RES' ? ' mr-2' : '')} title={item.title || ''}>{item.title || ''}</div>
          {item.tagImage ? <img className="music-card__extension" src={albumart(item.tagImage)} alt="" /> : null}
        </div>
        <p className="music-card__meta">{item.meta || countMeta || item.artist || ''}</p>
      </div>
    </div>
  );
}
