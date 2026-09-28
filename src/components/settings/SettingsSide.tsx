/** The settings shell's right column: only widgets backed by real device data; a page without data shows no column. */
import { useMenu } from '../../core/store/menu';
import { useSettings } from '../../core/store/settings';
import { usePlayer } from '../../core/store/player';

export default function SettingsSide() {
  const key = useSettings(s => s.pageKey());
  const alsa = useSettings(s => s.alsa);
  const network = useSettings(s => s.network);
  const stats = useSettings(s => s.stats);
  const systemInfo = useMenu(s => s.systemInfo);
  const st: any = usePlayer(s => s.state);
  if (!key) { return null; }
  const num = (s: any) => { const m = String(s || '').match(/^([\d.]+)/); return m ? m[1] : ''; };
  const fmt = String(st.trackType || st.stream || '').toUpperCase();
  const b = num(st.bitdepth), r = num(st.samplerate);
  const rate = b && r ? `${b}/${r}` : (b || r);
  const svc = st.service && st.service !== 'mpd' ? ` · ${String(st.service).toUpperCase()}` : '';
  const source = (fmt || rate) ? `${fmt}${rate ? ' ' + rate : ''}${svc}` : '';
  const resampling = alsa ? alsa.resampling : null;
  const mixer = alsa ? [alsa.mixerType, alsa.mixer].filter(Boolean).join(' · ') : '';
  const scanning = !!st.updatedb;
  return (
    <aside className="aw-sside">
      {key === 'playback' ? (
        <div>
          <div className="aw-sside__eyebrow mono">LIVE SIGNAL PATH</div>
          {resampling !== null ? <div className="aw-badge"><span className={'aw-badge__dot' + (resampling ? ' aw-badge__dot--warn' : '')} /><span className="mono">{resampling ? 'RESAMPLING' : 'BIT PERFECT'}</span></div> : null}
          <ol className="aw-path">
            {source ? <li><div className="aw-path__name">Source</div><div className="aw-path__val mono">{source}</div></li> : null}
            {resampling !== null ? <li><div className="aw-path__name">Resampling</div><div className="aw-path__val mono">{resampling ? (alsa && alsa.resamplingTarget ? 'ON · ' + alsa.resamplingTarget : 'ON') : 'NONE · PASSTHROUGH'}</div></li> : null}
            {mixer ? <li><div className="aw-path__name">Volume</div><div className="aw-path__val mono">{mixer}</div></li> : null}
            {alsa && alsa.output ? <li><div className="aw-path__name">Output</div><div className="aw-path__val mono">{alsa.output}</div></li> : null}
          </ol>
        </div>
      ) : null}
      {key === 'system' && systemInfo ? (
        <div>
          <div className="aw-sside__eyebrow mono">THIS PLAYER</div>
          <div className="aw-kv">
            <div className="aw-kv__title mono">HARDWARE</div>
            <div className="aw-kv__row"><span>Board</span><span className="mono">{systemInfo.hardware}</span></div>
            {systemInfo.os ? <div className="aw-kv__row"><span>OS</span><span className="mono">{systemInfo.os}</span></div> : null}
            <div className="aw-kv__row"><span>Version</span><span className="mono">{systemInfo.systemversion}</span></div>
            {systemInfo.builddate ? <div className="aw-kv__row"><span>Built</span><span className="mono">{systemInfo.builddate}</span></div> : null}
            <div className="aw-kv__row"><span>Name</span><span className="mono">{systemInfo.name}</span></div>
          </div>
        </div>
      ) : null}
      {key === 'network' ? (
        <div>
          <div className="aw-sside__eyebrow mono">INTERFACE</div>
          {(network || []).map((n: any, i: number) => (
            <div className="aw-kv" key={i}>
              <div className="aw-kv__title mono">{String(n.type || '').toUpperCase()}</div>
              {i === 0 && systemInfo ? <div className="aw-kv__row"><span>Hostname</span><span className="mono">{systemInfo.name}</span></div> : null}
              {n.ssid ? <div className="aw-kv__row"><span>SSID</span><span className="mono">{n.ssid}</span></div> : null}
              {n.ip ? <div className="aw-kv__row"><span>IP</span><span className="mono">{n.ip}</span></div> : null}
              {n.speed ? <div className="aw-kv__row"><span>Speed</span><span className="mono">{n.speed}</span></div> : null}
              {n.status ? <div className="aw-kv__row"><span>Status</span><span className="mono">{n.status}</span></div> : null}
            </div>
          ))}
        </div>
      ) : null}
      {key === 'sources' ? (
        <div>
          <div className="aw-sside__eyebrow mono">LIBRARY</div>
          <div className="aw-badge"><span className={'aw-badge__dot' + (!scanning ? ' aw-badge__dot--idle' : '')} /><span className="mono">{scanning ? 'SCANNING' : 'IDLE'}</span></div>
          {stats ? (
            <div className="aw-kv">
              <div className="aw-kv__title mono">COLLECTION</div>
              <div className="aw-kv__row"><span>Artists</span><span className="mono">{stats.artists}</span></div>
              <div className="aw-kv__row"><span>Albums</span><span className="mono">{stats.albums}</span></div>
              <div className="aw-kv__row"><span>Tracks</span><span className="mono">{stats.songs}</span></div>
              <div className="aw-kv__row"><span>Playtime</span><span className="mono">{stats.playtime}</span></div>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
