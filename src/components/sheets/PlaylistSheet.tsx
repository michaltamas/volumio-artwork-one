/** "Add to playlist" (Dialogs mockup): Favourites + the real playlists; pick one, confirm with Add; a new name creates it. */
import { useState } from 'react';
import Icon from '../Icon';
import { useModal } from '../../core/store/modal';
import { usePlaylists } from '../../core/store/playlists';
import { useBrowse } from '../../core/store/browse';

export default function PlaylistSheet() {
  const data = useModal(s => s.data) || {};
  const playlists = usePlaylists(s => s.playlists);
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const close = () => useModal.getState().close();
  const subject = data.addQueue ? 'Queue' : (data.item ? (data.item.title || data.item.name || data.item.album || '') : '');
  const doAdd = (name: string) => {
    if (data.addQueue) { usePlaylists.getState().addQueueToPlaylist(name); } else { usePlaylists.getState().addToPlaylist(data.item, name); }
    close();
  };
  const confirm = () => {
    if (selected === 'favourites') { usePlaylists.getState().addToFavourites(data.item); useBrowse.getState().favouritesChanged(); close(); }
    else if (selected) { doAdd(selected); }
  };
  const row = (key: string, label: string) => (
    <button type="button" key={key} className={'aw-playlist__row' + (selected === key ? ' active' : '')} role="option" aria-selected={selected === key} onClick={() => setSelected(key)}>
      <Icon name={selected === key ? 'check_circle' : 'radio_button_unchecked'} /><span className="aw-playlist__name">{label}</span>
    </button>
  );
  return (
    <div className="aw-sheet aw-sheet--playlist">
      <div className="aw-sheet__head">
        <Icon name="playlist_add" className="aw-sheet__icon" />
        <div className="aw-sheet__titles"><div className="aw-sheet__title">{data.title || 'Add to playlist'}</div>{subject ? <div className="aw-sheet__sub">{subject}</div> : null}</div>
        <button type="button" className="aw-sheet__close" onClick={close} aria-label="Close"><Icon name="close" /></button>
      </div>
      <div className="aw-playlist__new">
        <label className="aw-playlist__input"><Icon name="add" /><input type="text" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="New" aria-label="New" onKeyDown={(e) => { if (e.key === 'Enter' && custom.length) { doAdd(custom); } }} /></label>
        <button type="button" className="aw-playlist__create" disabled={!custom.length} onClick={() => doAdd(custom)}><span>New</span></button>
      </div>
      <div className="aw-playlist__list-wrap">
        <div className="aw-sheet__eyebrow mono">PLAYLISTS</div>
        <div className="aw-playlist__list" role="listbox">
          {row('favourites', 'Favorites')}
          {playlists.map(p => row(p, p))}
        </div>
      </div>
      <div className="aw-sheet__foot">
        <span className="aw-sheet__status mono">{selected ? 1 : 0} SELECTED</span>
        <button type="button" className="aw-sheet__btn" onClick={close}><span>Cancel</span></button>
        <button type="button" className="aw-sheet__btn aw-sheet__btn--primary" disabled={!selected} onClick={confirm}><span>Add</span></button>
      </div>
    </div>
  );
}
