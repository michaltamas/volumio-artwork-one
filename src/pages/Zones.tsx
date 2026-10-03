/** Zones (multiroom): the real device list, laid out as rows (44px icon tile · name + host · status · volume · actions). */
import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import { useMultiroom, type Zone } from '../core/store/multiroom';
import { usePlayer } from '../core/store/player';
import { emit, HOST } from '../core/socket';
import { useLocalPlayback } from '../core/localPlayback';
import { LocalPlaybackStatus, LocalPlaybackSwitch } from '../components/LocalPlaybackControl';

interface Device extends Zone { isChild?: boolean; ip?: string; child?: Device[]; groupable?: boolean; leader?: any; state?: any; host?: string }

const flatten = (list: Zone[]): Device[] => { const out: Device[] = []; (list || []).forEach((d: any) => { out.push(d); (d.child || []).forEach((c: any) => { c.isChild = true; out.push(c); }); }); return out; };
const isGrouped = (d: Device) => !!(d && (d.groupable || d.leader || (d.child && d.child.length)));
const canSetVolume = (d: Device) => !!(d && d.state && (d.isSelf || d.isChild || isGrouped(d)));

function ZoneVolume({ device }: { device: Device }) {
  const [local, setLocal] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const v = local === null ? Number(device.state?.volume ?? 0) : local;
  useEffect(() => { setLocal(null); }, [device.state?.volume]);
  const setVolume = (n: number) => {
    setLocal(n);
    if (device.isSelf) { usePlayer.getState().setVolume(n); return; }
    if (timer.current) { window.clearTimeout(timer.current); }
    timer.current = window.setTimeout(() => { timer.current = null; if (device.isChild) { emit('setMultiroom', { ip: device.ip, volume: n }); } else if (isGrouped(device)) { emit('setMultiroom', { ip: device.ip, groupvolume: n }); } }, 300);
  };
  return (
    <>
      <input type="range" min={0} max={100} step={1} value={v} style={{ ['--aw-fill' as any]: v + '%' }} onChange={(e) => setVolume(Number(e.target.value))} aria-label={'Volume ' + device.name} />
      <span className="mono">{v}</span>
    </>
  );
}

export default function Zones() {
  const zones = useMultiroom(s => s.zones);
  const devices = flatten(zones);
  const groupTargets = (d: Device) => devices.filter(x => x !== d && !x.isChild);
  const group = (d: Device, target: Device | undefined) => { if (!d || !target) { return; } emit('setMultiroom', { ip: d.ip, set: 'client' }); emit('setMultiroom', { ip: target.ip, set: 'server' }); };
  const ungroup = (d: Device) => { if (d && d.ip) { emit('setMultiroom', { ip: d.ip, set: 'single' }); } };
  const localAvailable = useLocalPlayback(s => s.available);
  const switchTo = (d: Device) => { if (d && !d.isChild && !d.isSelf && d.host && d.host !== HOST) { window.location.href = d.host; } };
  return (
    <div id="aw-zones" className="aw-zones">
      <PageHead variant="list" nav={<Crumbs root="Zones" />} />
      <div className="aw-listhead">
        <h1 className="aw-listhead__title">Zones</h1>
        {devices.length ? <span className="aw-listhead__count mono">{devices.length}</span> : null}
      </div>
      {!devices.length ? <p className="aw-zones__empty">No other Volumio devices found on this network.</p> : null}
      {devices.length ? <div className="aw-zones__cols mono" aria-hidden="true"><span /><span>NAME</span><span>NOW PLAYING</span><span>VOLUME</span><span /></div> : null}
      {devices.map((device, i) => {
        const st = device.state || {};
        return (
          <div key={(device.id || device.host || '') + i} className={'aw-zone' + (device.isSelf ? ' aw-zone--self' : '') + (device.isChild ? ' aw-zone--child' : '')}>
            <div className="aw-zone__icon">
              {st.albumart ? <img src={st.albumart} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
              <Icon name="speaker" />
            </div>
            <div className="aw-zone__name">
              <div className="aw-zone__title">{device.name}</div>
              <div className="aw-zone__sub">{device.host}{device.isSelf ? <><span className="aw-zone__sep">·</span>this device</> : null}{device.isChild ? <><span className="aw-zone__sep">·</span>grouped</> : null}</div>
            </div>
            <div className="aw-zone__np">
              <span className={'aw-zone__dot' + (st.status === 'play' ? ' aw-zone__dot--on' : '')} />
              {st.track ? <span className="aw-zone__track">{st.artist}{st.artist && st.track ? <span className="aw-zone__sep">·</span> : null}{st.track}</span> : <span className="aw-zone__idle">{st.status || 'idle'}</span>}
            </div>
            <div className="aw-zone__vol">{canSetVolume(device) ? <ZoneVolume device={device} /> : null}</div>
            <div className="aw-zone__act">
              {!device.isSelf && !device.isChild ? <button type="button" className="aw-zone__btn" onClick={() => switchTo(device)}>Open</button> : null}
              {!device.isChild && groupTargets(device).length ? (
                <select className="aw-zone__btn aw-zone__group" value="" onChange={(e) => { const t = groupTargets(device)[Number(e.target.value)]; group(device, t); e.target.value = ''; }} aria-label={'Group ' + device.name}>
                  <option value="">Group…</option>
                  {groupTargets(device).map((t, j) => <option key={j} value={j}>{'Play with ' + t.name}</option>)}
                </select>
              ) : null}
              {device.isChild ? <button type="button" className="aw-zone__btn" onClick={() => ungroup(device)}>Ungroup</button> : null}
            </div>
          </div>
        );
      })}
      {localAvailable ? (
        <div className="aw-zone aw-zone--local">
          <div className="aw-zone__icon"><Icon name="headphones" /></div>
          <div className="aw-zone__name">
            <div className="aw-zone__title">This browser</div>
            <div className="aw-zone__sub"><LocalPlaybackStatus /></div>
          </div>
          <div className="aw-zone__np" />
          <div className="aw-zone__vol" />
          <div className="aw-zone__act"><LocalPlaybackSwitch /></div>
        </div>
      ) : null}
    </div>
  );
}
