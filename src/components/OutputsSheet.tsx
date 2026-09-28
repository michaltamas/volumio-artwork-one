/**
 * Zones & outputs: this device, the active groups, the devices available to group — and a
 * grouping view. A panel on the right on wide screens, a bottom sheet on the phone whose handle
 * drags it away. The markup keeps Volumio's own names so the theme's dress applies.
 */
import { useRef, useState } from 'react';
import Icon from './Icon';
import { useUi } from '../core/store/ui';
import { useOutputs, type Output } from '../core/store/outputs';
import { usePlayer } from '../core/store/player';
import { albumart } from '../core/api';
import { useSheetDrag } from '../core/useSheetDrag';
import { HOST } from '../core/socket';
import { useLocalPlayback } from '../core/localPlayback';
import { LocalPlaybackStatus, LocalPlaybackSwitch } from './LocalPlaybackControl';

function DeviceVolume({ o }: { o: Output }) {
  const selfVolume = usePlayer(s => s.state.volume);
  const selfMute = usePlayer(s => !!s.state.mute);
  const [local, setLocal] = useState<number | null>(null);
  if (!o.volumeAvailable) { return null; }
  const muted = o.isSelf ? selfMute : !!(o.state && o.state.mute);
  const value = local !== null ? local : (o.isSelf ? (selfVolume ?? 0) : (o.state ? o.state.volume || 0 : 0));
  return (
    <div className="device__volume">
      <button type="button" className="outputs__action device__control device__control--volume" onClick={() => useOutputs.getState().toggleMute(o)} title={'Volume ' + value}>
        <Icon name={muted ? 'volume_off' : 'volume_up'} className="outputs__action__icon" />
      </button>
      <div className="volume-control__popover">
        <input type="range" min={0} max={100} value={value} onChange={(e) => setLocal(Number(e.target.value))}
          onPointerUp={(e) => { const v = Number((e.target as HTMLInputElement).value); setLocal(null); if (o.isSelf) { usePlayer.getState().setVolume(v); } else { useOutputs.getState().setVolume(o, v); } }} />
      </div>
    </div>
  );
}

function Song({ o }: { o: Output }) {
  const st = o.state || {};
  const artist = st.artist && st.artist !== 'undefined' ? st.artist : '';
  const track = st.track && st.track !== 'undefined' ? st.track : (st.title || '');
  return (
    <div className="device__meta">
      {(st.status === 'pause' || st.status === 'stop') && o.available ? <button type="button" className="outputs__action device__control device__control--play" onClick={() => useOutputs.getState().play(o)}><Icon name="play_arrow" /></button> : null}
      {st.status === 'play' && o.available ? <button type="button" className="outputs__action device__control device__control--play" onClick={() => useOutputs.getState().pause(o)}><Icon name="pause" /></button> : null}
      <span className="device__meta__song" title={track + ' - ' + artist}>{artist}{artist && track ? ' - ' : ''}{track}</span>
    </div>
  );
}

// another player: the interface follows it there
function goTo(o: Output) { if (o.host && o.host !== HOST) { window.location.href = o.host; } }

export default function OutputsSheet() {
  const open = useUi(s => s.outputsOpen);
  const self = useOutputs(s => s.thisOutput);
  const groups = useOutputs(s => s.groups);
  const outputs = useOutputs(s => s.outputs);
  const [grouping, setGrouping] = useState(false);
  const lp = useLocalPlayback();
  const panel = useRef<HTMLDivElement>(null);
  const close = () => useUi.getState().toggleOutputs();
  const drag = useSheetDrag(panel, close);
  if (!open) { return null; }
  const o = useOutputs.getState();
  const available = o.available(), enabled = o.enabled(), groupable = o.groupable();
  const cover = (x: Output | null) => x && x.state && x.state.albumart ? albumart(x.state.albumart) : '';
  return (
    <>
      <div id="sideMenuScrim" onClick={close} />
      <div id="sideMenu">
        <div role="group" className="outputs__menu" ref={panel}>
          <button type="button" className="outputs__grab" onPointerDown={drag.onPointerDown} onClick={drag.onClick} aria-label="Close" />
          {!grouping ? (
            <div className="outputs__overview">
              <div className="outputs__title align-items-center">
                <div className="outputs__title__text">Zones &amp; outputs</div>
                {self && self.groupable ? <div className="outputs__title__action"><button type="button" onClick={() => setGrouping(true)} className="outputs__action">Group devices<Icon name="speaker_group" className="outputs__action__icon" /></button></div> : null}
              </div>
              {self && !o.hasLeader() ? (
                <div>
                  <div className="outputs__subtitle small link">This device</div>
                  <div className="outputs__device device">
                    {self.state ? <div className="device__thumb"><img src={cover(self)} alt="cover image" /></div> : null}
                    <div className="device__info">
                      <div className="device__title"><div className="device__title__text clickable">{self.name}</div></div>
                      <DeviceVolume o={self} />
                      <Song o={self} />
                    </div>
                  </div>
                </div>
              ) : null}
              {lp.available ? (
                <div>
                  <div className="outputs__subtitle small link">This browser</div>
                  <div className="outputs__device device aw-local">
                    <div className="aw-local__icon"><Icon name="headphones" /></div>
                    <div className="device__info">
                      <div className="device__title"><div className="device__title__text">Play in this browser</div></div>
                      <div className="aw-local__hint"><LocalPlaybackStatus /></div>
                    </div>
                    <LocalPlaybackSwitch />
                  </div>
                </div>
              ) : null}
              {groups.length ? (
                <div>
                  <div className="outputs__subtitle small link">Active group</div>
                  {groups.map(g => (
                    <div key={g.leader.id} className="outputs__device device groupped">
                      <div className="device__thumb" onClick={() => goTo(g.leader)}><img src={cover(g.leader)} alt="cover image" /></div>
                      <div className="device__info"><Song o={g.leader} /></div>
                      <div className="device__group">
                        <div className="device__group__item">
                          <div className="device__title"><div className="device__title__text" onClick={() => goTo(g.leader)}>{g.leader.name}</div></div>
                          <DeviceVolume o={g.leader} />
                          <div className="device__meta">{self && g.leader.id === self.id ? 'This device' : 'Group leader'}</div>
                        </div>
                        {g.children.map(c => (
                          <div key={c.id} className="device__group__item">
                            <div className="device__title"><div className="device__title__text" onClick={() => goTo(c)}>{c.name}</div></div>
                            <DeviceVolume o={c} />
                            <div className="device__meta"><button type="button" onClick={() => o.disable(c.id)} className="outputs__action outputs__action--primary">Remove</button></div>
                          </div>
                        ))}
                      </div>
                      <div className="device__group__action"><button type="button" onClick={() => o.removeAll()} className="outputs__action">Remove all devices<Icon name="speaker_group" className="outputs__action__icon device__group__remove-icon" /></button></div>
                    </div>
                  ))}
                </div>
              ) : null}
              {available.length ? (
                <div>
                  <div className="outputs__subtitle small link">Available devices</div>
                  {available.map(x => (
                    <div key={x.id} className="outputs__device device">
                      {x.state ? <div className="device__thumb" onClick={() => goTo(x)}><img src={cover(x)} alt="cover image" /></div> : null}
                      <div className="device__info">
                        <div className="device__title"><div className="device__title__text" onClick={() => goTo(x)}>{x.name}</div></div>
                        <DeviceVolume o={x} />
                        <Song o={x} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="outputs__grouping">
              <div className="outputs__title align-items-center">
                <div className="outputs__title__text">Group devices</div>
                <div className="outputs__title__action"><button type="button" onClick={() => setGrouping(false)} className="outputs__action">Done</button></div>
              </div>
              {self ? (
                <div className="outputs__device device">
                  <div className="device__thumb small"><img src={cover(self)} alt="cover image" /></div>
                  <div className="device__info">
                    <div className="device__title"><div className="device__title__text">{self.name}</div></div>
                    <div className="device__meta"><span className="device__meta__song">This device</span></div>
                    {enabled.map(x => (
                      <div key={x.id} className="device__title"><div className="device__title__text">{x.name}</div><div className="device__actions"><button type="button" onClick={() => o.disable(x.id)} className="outputs__action outputs__action--primary">Remove</button></div></div>
                    ))}
                  </div>
                </div>
              ) : null}
              {enabled.length ? <div className="device__group__action"><button type="button" onClick={() => o.removeAll()} className="outputs__action">Remove all devices<Icon name="speaker_group" className="outputs__action__icon device__group__remove-icon" /></button></div> : null}
              <div>
                {groupable.length ? <div className="outputs__subtitle small">Available devices</div> : null}
                {outputs.filter(x => !x.isSelf && !x.enabled).map(x => (
                  <div key={x.id} className={'outputs__device device' + (x.groupable ? '' : ' disabled')}>
                    <div className="device__thumb small"><img src={cover(x)} alt="cover image" /></div>
                    <div className="device__info">
                      <div className="device__title">
                        <div className="device__title__text">{x.name}</div>
                        {x.groupable ? <div className="device__actions"><button type="button" onClick={() => o.enable(x.id)} className="outputs__action outputs__action--primary">Add</button></div> : <div className="device__actions"><Icon name="block" /></div>}
                      </div>
                      {!x.groupable ? <div className="device__meta"><span className="device__meta__song">Synced playback not available</span></div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
