/** The track actions sheet (⋯ on Now Playing): shuffle / repeat / favourite / playlist, credits and stories, go to artist / album, tweet. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { useModal } from '../../core/store/modal';
import { usePlayer } from '../../core/store/player';
import { useUiSettings } from '../../core/store/uiSettings';
import { useBrowse } from '../../core/store/browse';
import { HOST, emit } from '../../core/socket';
import { addToPlaylist } from '../../core/browseActions';
import { useLocalPlayback } from '../../core/localPlayback';
import Spinner from '../Spinner';

async function metavolumio(data: Record<string, string>): Promise<any> {
  const ctl = new AbortController(); const t = window.setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(HOST + '/api/v1/pluginEndpoint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: 'metavolumio', data }), signal: ctl.signal });
    const j = await r.json();
    if (j && j.success && j.data && j.data.value) { return j.data; }
    throw new Error('no data');
  } finally { window.clearTimeout(t); }
}

export default function TrackActionsSheet() {
  const st: any = usePlayer(s => s.state);
  const fav = usePlayer(s => s.favourite.favourite);
  const settings = useUiSettings(s => s.settings);
  const nav = useNavigate();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<Record<string, boolean>>({});
  const close = () => useModal.getState().close();
  const lp = useLocalPlayback();
  const here = lp.enabled && lp.mine;
  const ask = async (key: string, data: Record<string, string>, title: string, credits?: boolean) => {
    setBusy(b => ({ ...b, [key]: true }));
    try { const d = await metavolumio(data); setErr(e => ({ ...e, [key]: false })); useModal.getState().open('credits', credits ? { title, credits: d.value } : { title, story: d.value }); }
    catch { setErr(e => ({ ...e, [key]: true })); }
    finally { setBusy(b => ({ ...b, [key]: false })); }
  };
  // Volumio's goTo: the library search for the artist / album
  // the library's own pages for the artist and the album (as a tap in the library opens them); other services go through the player's goTo
  const goTo = (type: 'artist' | 'album') => {
    if (String(st.service || '') === 'mpd' && st.artist) {
      const item = type === 'artist'
        ? { uri: 'artists://' + encodeURIComponent(st.artist), title: st.artist, name: st.artist, type: 'folder', service: 'mpd' }
        : { uri: 'albums://' + encodeURIComponent(st.artist) + '/' + encodeURIComponent(st.album || ''), title: st.album, name: st.album, type: 'folder', service: 'mpd' };
      useBrowse.getState().open(item, true); nav('/browse'); close(); return;
    }
    useBrowse.getState().backHome(); nav('/browse'); window.setTimeout(() => { useBrowse.setState({ isSearching: true, isBrowsing: false }); emit('goTo', { type, value: st[type], artist: st.artist, album: st.album }); }, 0); close();
  };
  const tweet = () => {
    const data = settings.trackManagerButtonBar && settings.trackManagerButtonBar.actions && settings.trackManagerButtonBar.actions.twitterData;
    let q = encodeURI(`text=♫ ${st.artist} - ${st.title}`) + '&hashtags=nowplaying' + '&via=' + ((data && data.via) || 'volumio') + '&url=' + ((data && data.url) || 'http://www.volumio.com');
    const w = 500, h = 400, left = Math.ceil((window.innerWidth - w) / 2), top = Math.ceil((window.innerHeight - h) / 2);
    window.open('http://twitter.com/share?' + q, 'twitter', `status=1,width=${w},height=${h},top=${top},left=${left}`);
    close();
  };
  const twitterOn = !(settings.trackManagerButtonBar && settings.trackManagerButtonBar.actions && settings.trackManagerButtonBar.actions.twitter === false);
  const repeatTile = !st.repeat
    ? <button type="button" className="aw-track__tile" onClick={() => emit('setRepeat', { value: true, repeatSingle: false })} title="Repeat all"><Icon name="repeat" /></button>
    : (!st.repeatSingle
      ? <button type="button" className="aw-track__tile active" onClick={() => emit('setRepeat', { value: true, repeatSingle: true })} title="Repeat single"><Icon name="repeat" /></button>
      : <button type="button" className="aw-track__tile active" onClick={() => emit('setRepeat', { value: false, repeatSingle: false })} title="Repeat off"><Icon name="repeat_one" /></button>);
  const row = (key: string, icon: string, label: string, onClick: () => void) => (
    <button type="button" className={'aw-track__row' + (err[key] ? ' is-off' : '')} disabled={busy[key] || err[key]} onClick={onClick}>
      <Icon name={icon} /><span className="aw-track__label">{label}{err[key] ? ' · Not found' : ''}</span>{busy[key] ? <Spinner size={16} className="aw-track__spin" /> : null}
    </button>
  );
  return (
    <div className="aw-sheet aw-sheet--track">
      <div className="aw-confirm__head">
        <div className="aw-confirm__tile"><Icon name="more_horiz" /></div>
        <div className="aw-track__titles">
          <div className="aw-confirm__title">{st.title}</div>
          {st.artist || st.album ? <div className="aw-track__sub">{st.artist}{st.artist && st.album ? <span>&nbsp;·&nbsp;</span> : null}{st.album}</div> : null}
        </div>
      </div>
      <div className="aw-track__tiles">
        <button type="button" className={'aw-track__tile' + (st.random ? ' active' : '')} onClick={() => usePlayer.getState().shuffle()} title="Random"><Icon name="shuffle" /></button>
        {repeatTile}
        <button type="button" className={'aw-track__tile' + (fav ? ' active' : '')} onClick={() => usePlayer.getState().toggleFavourite()} title="Add to favourites" disabled={!!st.disableUi}><Icon name="favorite" /></button>
        <button type="button" className="aw-track__tile" onClick={() => { close(); addToPlaylist({ uri: String(st.uri || ''), service: st.service, type: 'song', title: st.title, artist: st.artist, album: st.album, albumart: st.albumart }); }} title="Add to Playlist" disabled={!!st.disableUi}><Icon name="playlist_add" /></button>
      </div>
      <div className="aw-track__rows">
        {row('credits', 'info', 'Album credits', () => ask('credits', { mode: 'creditsAlbum', artist: st.artist, album: st.album }, st.album, true))}
        {row('album', 'album', 'Album story', () => ask('album', { mode: 'storyAlbum', artist: st.artist, album: st.album }, st.album))}
        {row('artist', 'groups', 'Artist story', () => ask('artist', { mode: 'storyArtist', artist: st.artist }, st.artist))}
        {lp.available ? (
          <button type="button" className={'aw-track__row' + (here ? ' active' : '')} onClick={() => { lp.toggle(); close(); }}>
            <Icon name="headphones" /><span className="aw-track__label">{here ? 'Stop playing in this browser' : 'Play in this browser'}</span>
          </button>
        ) : null}
        <div className="aw-track__sep" />
        {st.artist ? <button type="button" className="aw-track__row" onClick={() => goTo('artist')}><Icon name="person" /><span className="aw-track__label">Go To Artist</span></button> : null}
        {st.album ? <button type="button" className="aw-track__row" onClick={() => goTo('album')}><Icon name="album" /><span className="aw-track__label">Go To Album</span></button> : null}
        {st.album && twitterOn ? <button type="button" className="aw-track__row" onClick={tweet}><Icon name="share" /><span className="aw-track__label">Tweet Track</span></button> : null}
        <button type="button" className="aw-power__cancel" onClick={close}><span>Close</span></button>
      </div>
    </div>
  );
}
