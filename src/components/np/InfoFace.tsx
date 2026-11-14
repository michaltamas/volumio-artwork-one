/**
 * The Info face (12B–12D): the artist and the record as two rows under a hairline, and the way to their pages.
 * Under the artist: who people listen to alongside them (a tap searches the library). Under the record and
 * in a third row, the track: the credits MusicBrainz has (producer, engineers, who wrote it, who plays on it).
 */
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { albumart } from '../../core/api';
import { usePlayer } from '../../core/store/player';
import { useAbout, type Credit } from '../../core/store/about';
import { useTrackInfo } from '../../core/store/trackInfo';
import { browseUrl } from '../../core/browseUrl';
import { useBrowse } from '../../core/store/browse';
import { KIOSK } from '../../core/kiosk';

export default function InfoFace() {
  const st: any = usePlayer(s => s.state);
  const artist = useAbout(s => s.artist);
  const album = useAbout(s => s.album);
  const track = useAbout(s => s.track);
  const info = useTrackInfo();
  const nav = useNavigate();
  if (!st.artist) { return null; }
  const canGo = String(st.service || '') === 'mpd' && !!st.artist;
  const img = (artist && artist.thumb) || (st.albumart ? albumart(st.albumart) : '');
  const artistSub = artist ? [artist.description, artist.begin].filter(Boolean).join(' · ') : '';
  const n = info.tracks;
  // the genre lives here, not on the Cover face (handoff 16B)
  const albumSub = [album && album.label, (album && album.year) || info.year, info.genre, n ? n + (n === 1 ? ' track' : ' tracks') : ''].filter(Boolean).join(' · ');
  const goArtist = () => { if (!canGo) { return; } const item = { uri: 'artists://' + encodeURIComponent(st.artist), title: st.artist, name: st.artist, type: 'folder', service: 'mpd' }; useBrowse.getState().open(item, true); nav(browseUrl(item)); };
  // a related artist: the search page, with the name typed in
  const findArtist = (e: React.MouseEvent, name: string) => { e.stopPropagation(); nav('/search'); window.setTimeout(() => useBrowse.getState().search(name), 50); };
  const creditRows = (list: Credit[]) => (
    <dl className="np-about__credits">
      {list.map(c => <div className="np-about__credit" key={c.role}><dt className="np-about__role mono">{c.role.toUpperCase()}</dt><dd className="np-about__names">{c.names.join(', ')}</dd></div>)}
    </dl>
  );
  const goAlbum = () => { if (!canGo || !st.album) { return; } const item = { uri: 'albums://' + encodeURIComponent(st.artist) + '/' + encodeURIComponent(st.album), title: st.album, name: st.album, type: 'folder', service: 'mpd' }; useBrowse.getState().open(item, true); nav(browseUrl(item)); };
  return (
    <div className="np-about">
      <div className="np-about__rule" />
      <div className={'np-about__row np-about__row--artist' + (canGo ? ' is-link' : '')} onClick={goArtist}>
        {img ? <img className="np-about__img np-about__img--round" src={img} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <div className="np-about__img np-about__img--round" />}
        <div className="np-about__body">
          <div className="np-about__head">
            <span className="np-about__name">{st.artist}</span>
            {artistSub ? <span className="np-about__sub">{artistSub}</span> : null}
          </div>
          {artist && artist.extract ? <p className="np-about__text">{artist.extract}</p> : null}
          {artist && artist.extract && artist.url && !KIOSK ? <a className="np-about__src mono" href={artist.url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>BIO · WIKIPEDIA</a> : null}
          {artist && artist.extract && (!artist.url || KIOSK) ? <span className="np-about__src mono">BIO · WIKIPEDIA</span> : null}
          {artist && artist.related && artist.related.length ? (
            <div className="np-about__related">
              <span className="np-about__role mono">RELATED</span>
              <div className="np-about__chips">{artist.related.map(r => <button type="button" className="np-about__chip" key={r.mbid} onClick={(e) => findArtist(e, r.name)} title={'Search for ' + r.name}>{r.name}</button>)}</div>
            </div>
          ) : null}
        </div>
        {canGo ? <button type="button" className="np-about__go" aria-label="Open the artist"><span>Artist</span><Icon name="chevron_right" /></button> : null}
      </div>
      {st.album ? (
        <div className={'np-about__row np-about__row--album' + (canGo ? ' is-link' : '')} onClick={goAlbum}>
          {st.albumart ? <img className="np-about__img" src={albumart(st.albumart)} alt="" /> : <div className="np-about__img" />}
          <div className="np-about__body">
            <div className="np-about__name">{st.album}</div>
            {albumSub ? <div className="np-about__sub">{albumSub}</div> : null}
            {album && album.extract ? <p className="np-about__text np-about__text--album">{album.extract}</p> : null}
            {album && album.credits && album.credits.length ? creditRows(album.credits) : null}
          </div>
          {canGo ? <button type="button" className="np-about__go" aria-label="Open the album"><span>Album</span><Icon name="chevron_right" /></button> : null}
        </div>
      ) : null}
      {track && track.credits.length ? (
        <div className="np-about__row np-about__row--track">
          <div className="np-about__img np-about__img--track"><Icon name="music_note" /></div>
          <div className="np-about__body">
            <div className="np-about__name">{st.title}</div>
            <div className="np-about__sub">This track</div>
            {creditRows(track.credits)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
