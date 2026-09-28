/**
 * Now Playing with nothing to show: where to find music, the queue when it has something, and the
 * last tracks played (Last_100) to start again with one tap.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { rest, albumart } from '../../core/api';
import { useBrowse, type BrowseItem } from '../../core/store/browse';
import { useQueue } from '../../core/store/queue';
import { usePlayer } from '../../core/store/player';
import { useUi } from '../../core/store/ui';
import { replaceAndPlay } from '../../core/browseActions';
import { mmss } from '../../core/format';

const RECENT = 6;

export default function NpEmpty() {
  const nav = useNavigate();
  const queued = useQueue(s => s.queue.length);
  const [recent, setRecent] = useState<BrowseItem[]>([]);
  useEffect(() => {
    let alive = true;
    rest<any>('browse', { uri: 'Last_100' }).then(j => {
      const lists = (j && j.navigation && j.navigation.lists) || [];
      const items: BrowseItem[] = lists.flatMap((l: any) => (l.items || []).filter((i: any) => i && i.uri && i.type === 'song'));
      if (alive) { setRecent(items.slice(0, RECENT)); }
    });
    return () => { alive = false; };
  }, []);
  const browse = () => { useBrowse.getState().backHome(); nav('/browse'); };
  const search = () => { useBrowse.getState().backHome(); useUi.setState({ searchFocus: true }); nav('/browse'); };
  return (
    <div className="np-empty">
      <div className="np-empty__intro">
        <div className="np-empty__icon"><Icon name="music_note" /></div>
        <h1 className="np-empty__title">Nothing playing yet</h1>
        <p className="np-empty__text">Pick an album, a playlist or a station and it shows up here.</p>
        <div className="np-empty__actions">
          <button type="button" className="aw-btn aw-btn--primary" onClick={browse}><Icon name="library_music" /><span>Browse</span></button>
          <button type="button" className="aw-btn" onClick={search}><Icon name="search" /><span>Search</span></button>
          {queued ? <button type="button" className="aw-btn" onClick={() => usePlayer.getState().play()}><Icon name="queue_music" /><span>Play the queue</span></button> : null}
        </div>
      </div>
      {recent.length ? (
        <div className="np-empty__recent">
          <div className="np-empty__eyebrow mono">RECENTLY PLAYED</div>
          <div className="np-empty__list">
            {recent.map((t, i) => (
              <button key={t.uri + i} type="button" className="np-empty__row" onClick={() => replaceAndPlay(t)} title={'Play ' + (t.title || '')}>
                <span className="np-empty__art">{t.albumart ? <img src={albumart(t.albumart)} alt="" loading="lazy" /> : <Icon name="music_note" />}<Icon name="play_arrow" className="np-empty__play" /></span>
                <span className="np-empty__meta">
                  <span className="np-empty__name">{t.title}</span>
                  <span className="np-empty__by">{[t.artist, t.album].filter(Boolean).join(' · ')}</span>
                </span>
                {Number(t.duration) > 0 ? <span className="np-empty__dur mono">{mmss(Number(t.duration) * 1000)}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
