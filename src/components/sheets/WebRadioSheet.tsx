/** Add / edit a web radio: name and stream URL (a stream, or a remote M3U / PLS). */
import { useState } from 'react';
import Icon from '../Icon';
import { useModal } from '../../core/store/modal';
import { usePlaylists } from '../../core/store/playlists';

export default function WebRadioSheet() {
  const data = useModal(s => s.data) || {};
  const [title, setTitle] = useState<string>((data.item && data.item.title) || '');
  const [uri, setUri] = useState<string>((data.item && data.item.uri) || '');
  const close = () => useModal.getState().close();
  const save = () => { usePlaylists.getState().addWebRadio({ title, uri }); close(); };
  return (
    <div className="aw-sheet aw-sheet--radio">
      <div className="aw-sheet__head">
        <Icon name="radio" className="aw-sheet__icon" />
        <div className="aw-sheet__titles"><div className="aw-sheet__title">Add Web Radio</div></div>
        <button type="button" className="aw-sheet__close" onClick={close} aria-label="Close"><Icon name="close" /></button>
      </div>
      <div className="aw-sheet__body">
        <div className="aw-sheet__section">
          <div className="aw-sheet__eyebrow mono">NAME</div>
          <label className="aw-playlist__input"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name" aria-label="Name" /></label>
        </div>
        <div className="aw-sheet__section">
          <div className="aw-sheet__eyebrow mono">URL</div>
          <label className="aw-playlist__input"><input type="text" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="Url" aria-label="Url" /></label>
          <div className="aw-sheet__doc">The URL can be either a stream URL or a M3U or PLS remote file</div>
        </div>
      </div>
      <div className="aw-sheet__foot">
        <button type="button" className="aw-sheet__btn" onClick={close}><span>Cancel</span></button>
        <button type="button" className="aw-sheet__btn aw-sheet__btn--primary" disabled={!title || !uri} onClick={save}><span>{data.edit ? 'Save' : 'Add'}</span></button>
      </div>
    </div>
  );
}
