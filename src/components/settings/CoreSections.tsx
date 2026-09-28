/** Volumio's own sections inside the settings pages (system version, network, wifi, library, functionalities, network drives, backgrounds, firmware). */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { usePhone } from '../../core/usePhone';
import { on, emit, HOST } from '../../core/socket';
import { useSettings } from '../../core/store/settings';
import { useUiSettings } from '../../core/store/uiSettings';
import { useModal } from '../../core/store/modal';
import { useToasts } from '../../core/store/toast';
import { Switch, Select, Progress, upload } from './controls';
import Spinner from '../Spinner';
import { usePlayer } from '../../core/store/player';

function useSocket<T>(event: string, ask?: string | (() => void), initial?: T): T | undefined {
  const [v, setV] = useState<T | undefined>(initial);
  useEffect(() => { const off = on(event, (d: any) => setV(d)); if (typeof ask === 'function') { ask(); } else if (ask) { emit(ask); } return off; }, [event]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

export function SystemVersion() {
  const sv: any = useSocket('pushSystemVersion', 'getSystemVersion') || {};
  return (
    <div id="systemVersion" className="panel panel-default">
      <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-info-circle" /> <span>System Version</span></h3></div>
      <div className="panel-body">
        <span className="sv-main"><span>System Version</span>: <span className="sv-value">{sv.systemversion}</span></span>
        <span className="sv-sub"><span>Released</span>: <span className="sv-value">{sv.builddate}</span></span>
        {sv.additionalSVInfo ? <div>{sv.additionalSVInfo}</div> : null}
      </div>
    </div>
  );
}

export function NetworkStatus() {
  const infos = useSettings(s => s.network) || [];
  useEffect(() => { emit('getInfoNetwork'); const off = on('pushInfoNetworkReload', () => { if (window.location.pathname === '/plugin/system_controller-network') { window.location.reload(); } }); return off; }, []);
  return (
    <div id="networkStatus" className="panel panel-default">
      <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-tachometer" /> <span>Network Status</span></h3></div>
      <div className="panel-body">
        <div className="networkStatus">
          {infos.map((n: any, i: number) => (
            <div className="panel panel-default col-sm-12" key={i}>
              <div className="panel-heading"><h3 className="panel-title">{n.type}</h3></div>
              <div className="panel-body"><ul>
                {n.ssid ? <li><span>{n.signal >= 0 ? <img src={'/assets/wifi-icons/' + n.signal + '.png'} alt="" className="signal-icon" /> : null}</span> {n.ssid}</li> : null}
                <li><span> <span>IP Address</span>:</span> {n.ip}</li>
                {n.speed ? <li><span> <span>Speed</span>:</span> {n.speed}</li> : null}
                {n.online !== undefined ? <li><span> <span>Online</span>:</span> <i className={'fa ' + (n.online ? 'fa-check true' : 'fa-remove false')}><Icon name={n.online ? 'check' : 'close'} /></i></li> : null}
              </ul></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MyMusic() {
  const [stats, setStats] = useState<any>({});
  // while Volumio indexes, the buttons give way to what it is doing (the counts below keep growing: asked every 4 s)
  const scanning = usePlayer(s => !!s.state.updatedb);
  useEffect(() => { const off = on('pushMyCollectionStats', (d: any) => setStats(d || {})); emit('getMyCollectionStats'); const t = window.setInterval(() => emit('getMyCollectionStats'), 4000); return () => { off(); window.clearInterval(t); }; }, []);
  return (
    <div id="myMusic" className="panel panel-default">
      <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-music" /> <span>My Music</span></h3></div>
      <div className="panel-body">
        <div className="aw-mystats">
          <div className="aw-mystats__item"><span className="aw-mystats__label">Artists</span><span className="aw-mystats__value">{stats.artists}</span></div>
          <div className="aw-mystats__item"><span className="aw-mystats__label">Albums</span><span className="aw-mystats__value">{stats.albums}</span></div>
          <div className="aw-mystats__item"><span className="aw-mystats__label">Tracks</span><span className="aw-mystats__value">{stats.songs}</span></div>
          <div className="aw-mystats__item"><span className="aw-mystats__label">Playtime</span><span className="aw-mystats__value">{stats.playtime}</span></div>
        </div>
        {scanning ? (
          <div className="aw-mystats__scan" role="status">
            <Spinner size={20} />
            <span className="aw-mystats__scan-text"><span className="aw-mystats__scan-title">Scanning your library…</span><span className="aw-mystats__scan-sub">The numbers grow as files are found</span></span>
          </div>
        ) : (
          <>
            <button type="button" className="btn btn-info" onClick={() => emit('updateDb')} title="Update music database entries for any changed, new, or deleted files"><span>Update</span></button>
            <button type="button" className="btn btn-info" onClick={() => emit('rescanDb')} title="Remake music database entries for all files"><span>Rescan</span></button>
          </>
        )}
      </div>
    </div>
  );
}

export function MyMusicPluginEnabler() {
  const nav = useNavigate();
  const plugins: any[] = useSocket('pushMyMusicPlugins', 'getMyMusicPlugins') || [];
  if (!plugins.length) { return <div id="myMusicPlugins" className="panel panel-default" />; }
  return (
    <div id="myMusicPlugins" className="panel panel-default">
      <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-toggle-on" /> <span>Functionalities control</span></h3></div>
      <div className="panel-body">
        {plugins.map((pl, i) => (
          <div id="installed-plugin-lists" key={i}>
            <div className="row">
              <div className="col-xs-24 col-sm-24 col-md-12" id="list-group"><div className="row">
                <div className="col-xs-12 col-sm-12 col-md-16">{pl.icon ? <i className={'fa ' + pl.icon + ' fa-lg'} /> : null}{pl.prettyName}</div>
                <div className="col-xs-8 col-sm-8 col-md-8"><Switch on={pl.enabled === true || pl.enabled === 'true'} onChange={(v) => { pl.enabled = v; emit('enableDisableMyMusicPlugin', pl); }} label={pl.prettyName} /></div>
              </div></div>
              <div className="col-xs-24 col-sm-24 col-md-10" id="list-group">
                <div className="col-xs-12 col-sm-12 col-md-12"><span className={'pluginDotStatus' + (pl.active ? ' active' : ' inactive')} /><span>{pl.active ? 'Active' : 'Inactive'}</span></div>
                <div className="col-xs-12 col-sm-12 col-md-12">{pl.enabled && pl.hasConfiguration ? <button type="button" className="btn btn-info pull-right" onClick={() => nav('/plugin/' + pl.category + '-' + pl.name + '?isPluginSettings=1')} title="Settings">Settings</button> : null}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriveForm({ drive, setDrive, adding, onSave, onCancel, shares }: { drive: any; setDrive: (d: any) => void; adding: boolean; onSave: () => void; onCancel: () => void; shares: any }) {
  const [advanced, setAdvanced] = useState(!adding);
  const [pwType, setPwType] = useState('password');
  const [open, setOpen] = useState<number | null>(null);
  const field = (key: string, label: string, placeholder: string, doc?: string, type = 'text') => (
    <div className="form-group">
      <label className="control-label"><span>{label}</span></label>
      <div className="control-item"><input type={type} value={drive[key] || ''} onChange={(e) => setDrive({ ...drive, [key]: e.target.value })} placeholder={placeholder} className="form-control" /></div>
      {doc ? <div className="control-description"><span>{doc}</span></div> : null}
    </div>
  );
  return (
    <>
      {adding ? (
        <div>
          {!shares ? <div className="text-center col-sm-12 col-sm-offset-6"><div className="alert alert-info" role="alert"><Spinner size={16} /> <span>Scanning for network drives</span></div></div> : null}
          {shares && shares.nas && shares.nas.length === 0 ? <div className="text-center col-sm-12 col-sm-offset-6"><div className="alert alert-info" role="alert"><Icon name="error" /> <span>No Network Drives Found</span></div></div> : null}
          {shares && shares.nas && shares.nas.length ? (
            <div className="row"><div className="col-sm-12 col-sm-offset-6">
              {shares.nas.map((share: any, i: number) => (
                <div className="panel panel-default" key={i}>
                  <div className="panel-heading"><h4 className="panel-title"><div className="accordion-toggle" onClick={() => setOpen(open === i ? null : i)}><span><Icon name={open === i ? 'remove' : 'add'} /> {share.name} <Icon name="storage" className="pull-right" /></span></div></h4></div>
                  {open === i ? <div className="panel-body">{(share.shares || []).map((disk: any, j: number) => (
                    <div className="radio" key={j}><label><input type="radio" name={'share-' + share.name} onChange={() => setDrive({ ...drive, ip: share.ip || share.name, name: disk.sharename, path: disk.path })} /> {disk.sharename}</label></div>
                  ))}</div> : null}
                </div>
              ))}
            </div></div>
          ) : null}
        </div>
      ) : null}
      <form className="form-horizontal" onSubmit={(e) => e.preventDefault()}>
        {field('name', 'Alias', 'Name', 'Choose an Alias that will be displayed in NAS Mounts')}
        {field('ip', 'NAS IP Address', 'NAS Ip Address or Name', 'IP Address of your Network Drive')}
        {field('path', 'Path', 'Path/to/Share', 'Network Share Name or subfolder path')}
        {advanced ? (
          <div>
            <div className="form-group"><label className="control-label"><span>File Share Type</span></label><div className="control-item"><Select value={drive.fstype} options={['cifs', 'nfs']} onChange={(o) => setDrive({ ...drive, fstype: o })} placeholder="Fs type" /></div></div>
            {field('username', 'Username', 'Username')}
            {field('password', 'Password', 'Password', undefined, pwType)}
            {field('options', 'Options', 'Options')}
          </div>
        ) : null}
        <div className="form-group"><label className="control-label" /><div className="control-item">
          {!advanced ? <button type="button" className="btn btn-info" onClick={() => setAdvanced(true)}><span>Show Advanced Options</span></button> : <button type="button" className="btn btn-warning" onClick={() => setAdvanced(false)}><span>Hide Advanced Options</span></button>}
          {advanced ? <button type="button" className="btn btn-link" onClick={() => setPwType(pwType === 'password' ? 'text' : 'password')} aria-label="Show password"><Icon name={pwType === 'password' ? 'visibility' : 'visibility_off'} /></button> : null}
        </div></div>
        <div className="form-group"><label className="control-label" /><div className="control-item">
          <button type="button" className="btn btn-warning" onClick={onCancel}><span>Cancel</span></button>
          <button type="button" className="btn btn-info saveAddEditDrive" onClick={onSave}><span>Save</span></button>
        </div></div>
      </form>
    </>
  );
}

export function NetworkDrives() {
  const phone = usePhone();   // the path column is the frame's desktop-only one
  const [shares, setShares] = useState<any[] | null>(null);
  const [discovered, setDiscovered] = useState<any>(undefined);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [drive, setDrive] = useState<any>({});
  useEffect(() => {
    const offs = [
      on('pushListShares', (d: any) => setShares(Array.isArray(d) ? d : [])),
      on('pushNetworkSharesDiscovery', (d: any) => setDiscovered(d)),
      on('pushAddShare', (d: any) => { useToasts.getState().show(d && d.success ? 'success' : 'error', d && d.success ? 'Share successfully mounted...' : 'An error occured during adding share', ''); emit('getListShares'); }),
      on('pushDeleteShare', (d: any) => { useToasts.getState().show(d && d.success ? 'success' : 'error', d && d.success ? 'Share successfully unmounted...' : 'An error occured during deleting share', ''); if (d && d.success) { emit('getListShares'); } }),
      on('nasCredentialsCheck', (d: any) => useModal.getState().open('nas-password', d)),
    ];
    emit('getListShares'); emit('getListUsbDrives');
    return () => offs.forEach(f => f());
  }, []);
  const save = () => { if (adding) { emit('addShare', drive); } else { emit('editShare', drive); } setAdding(false); setEditing(null); };
  const del = async (d: any) => { if (await useModal.getState().confirm({ title: 'Delete Drive', message: `Do you want to delete ${d.name}?`, danger: true })) { emit('deleteShare', { id: d.id }); } };
  return (
    <div>
      <div id="networkDrives" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-hdd-o" /> <span>Network Drives</span><i className="fa fa-info-circle pull-right" onClick={() => emit('showNasHelper')} /></h3></div>
        <div className="panel-body">
          <button type="button" id="addNewDrive" className="btn btn-info" onClick={() => { setDrive({ fstype: 'cifs' }); setAdding(true); setEditing(null); setDiscovered(undefined); emit('getNetworkSharesDiscovery'); }} title="Add New Drive">
            {!adding ? <span><Icon name="add" /> <span>Add New Drive</span></span> : <span><Icon name="refresh" /> <span>Rescan</span></span>}
          </button>
          <div className="clearfix" /><br />
          {adding ? <DriveForm drive={drive} setDrive={setDrive} adding onSave={save} onCancel={() => setAdding(false)} shares={discovered} /> : null}
          {shares ? (
            <table className="table tableSmall"><tbody>
              <tr><th><span>Alias</span></th>{!phone ? <th><span>Path</span></th> : null}<th><span>Mounted</span></th><th><span>Size</span></th><th /></tr>
              {shares.map((d: any, i: number) => (
                [<tr key={d.id || i}>
                  <td>{d.name}</td>
                  {!phone ? <td>\\{d.ip}\{d.path}</td> : null}
                  <td><i className={'fa ' + (d.mounted ? 'fa-check true' : 'fa-remove false')}><Icon name={d.mounted ? 'check' : 'close'} /></i></td>
                  <td>{d.size}</td>
                  <td className="commandCol">
                    <button type="button" className="btn btn-danger" onClick={() => del(d)} title="Delete Drive"><Icon name="delete" /></button>
                    <button type="button" className="btn btn-info" onClick={() => { setEditing(i); setAdding(false); setDrive(d); }} title="Edit Drive"><Icon name="edit" /></button>
                  </td>
                </tr>,
                editing === i ? <tr key={'e' + i}><td colSpan={5}><div className="row"><div className="col-xs-24"><DriveForm drive={drive} setDrive={setDrive} adding={false} onSave={save} onCancel={() => setEditing(null)} shares={null} /></div></div></td></tr> : null]
              ))}
            </tbody></table>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const SECURITY = [{ label: 'open' }, { label: 'wep' }, { label: 'wpa' }, { label: 'wpa2' }];
export function Wifi() {
  const [nets, setNets] = useState<any>({ available: [] });
  const [connected, setConnected] = useState<any>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    let retry = false;
    const off = on('pushWirelessNetworks', (data: any) => {
      const d = data || { available: [] };
      if (d.available && d.available.length === 0 && !retry) { retry = true; window.setTimeout(() => { emit('getWirelessNetworks'); retry = false; }, 2000); }
      setNets((cur: any) => {
        const list = (cur.available || []).slice();
        (d.available || []).forEach((n: any) => { const a = list.find((x: any) => x.ssid === n.ssid); if (a) { a.security = n.security; a.signal = n.signal; } else { list.push(n); } });
        const kept = list.filter((v: any) => !v.manual);
        kept.push({ security: SECURITY[0], signal: -1, ssidHidden: true, manual: true });
        kept.forEach((n: any) => { if (!n.security || n.security === '') { n.security = SECURITY[0]; n.hotSpot = true; } });
        return { available: kept };
      });
      if (d.connectedTo) { setConnected(d.connectedTo); }
    });
    emit('getWirelessNetworks');
    return off;
  }, []);
  const list: any[] = nets.available || [];
  if (!list.length && !connected) { return <div id="wifiPlugin" className="panel panel-default" style={{ display: 'none' }} />; }
  const isOpen = (w: any) => w.security === 'open' || (w.security && w.security.label === 'open');
  const connect = (w: any, i: number) => { emit('saveWirelessNetworkSettings', { ssid: w.ssid, security: (w.security && w.security.label) || w.security, password: w.password, hidden: w.hidden }); list[i].insertPassword = undefined; setTick(t => t + 1); };
  const signal = (s: number) => '/assets/wifi-icons/' + s + '.png';
  return (
    <div id="wifiPlugin" className="panel panel-default">
      <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-wifi" /> <span>Wireless Network Connection</span></h3></div>
      <div className="panel-body">
        <table className="table"><tbody>
          {connected ? (
            <tr>
              <td className="wifiIcon">{connected.signal >= 0 ? <img src={signal(connected.signal)} alt="" /> : null}</td>
              <td className="lockIcon"><span><i className={'fa ' + (connected.security === 'open' ? 'fa-unlock' : 'fa-lock')}><Icon name={connected.security === 'open' ? 'lock_open' : 'lock'} /></i></span></td>
              <td>{connected.ssid}</td><td /><td className="commandCol" />
            </tr>
          ) : null}
          {list.map((w, i) => ([
            <tr key={i} onClick={() => { list.forEach((x, j) => { x.insertPassword = j === i ? true : undefined; }); setTick(t => t + 1); }}>
              <td className="wifiIcon">{w.signal >= 0 ? <img src={signal(w.signal)} alt="" /> : <i className="fa fa-eye-slash"><Icon name="visibility_off" /></i>}</td>
              <td className="lockIcon"><span><i className={'fa ' + (isOpen(w) ? 'fa-unlock' : 'fa-lock')}><Icon name={isOpen(w) ? 'lock_open' : 'lock'} /></i></span></td>
              <td>{!w.manual ? <span>{w.ssid}</span> : <span>Manual WiFi Connection</span>}</td>
            </tr>,
            w.insertPassword ? (
              <tr key={'p' + i}><td colSpan={4} className="insertPasswordRow">
                {w.ssidHidden ? <span className="checkbox-wrapper"><input type="checkbox" id="customWifi" className="custom-checkbox" checked={!!w.hidden} onChange={(e) => { w.hidden = e.target.checked; setTick(t => t + 1); }} /><label htmlFor="customWifi" /><span>Hidden</span> &nbsp;|&nbsp; </span> : null}
                {w.ssidHidden || w.hotSpot ? <><span>Security</span> &nbsp;<div className="securitySelectWrapper"><Select value={w.security} options={SECURITY} onChange={(o) => { w.security = o; setTick(t => t + 1); }} placeholder="Select encryption" /></div></> : null}
                {w.ssidHidden ? <input className="form-control" value={w.ssid || ''} onChange={(e) => { w.ssid = e.target.value; setTick(t => t + 1); }} type="text" placeholder="Network Name" /> : null}
                {!isOpen(w) ? <input className="form-control" value={w.password || ''} onChange={(e) => { w.password = e.target.value; setTick(t => t + 1); }} type={w.showHidePassword || 'password'} placeholder="password" /> : null}
                <br />
                {!isOpen(w) && w.password && w.password.length ? <button type="button" className="btn btn-info showHidePassword" onClick={() => { w.showHidePassword = w.showHidePassword === 'text' ? 'password' : 'text'; setTick(t => t + 1); }}><Icon name={w.showHidePassword === 'text' ? 'visibility_off' : 'visibility'} /></button> : null}
                <button type="button" className="btn btn-info" onClick={() => connect(w, i)}><Icon name="subdirectory_arrow_right" /> <span>Connect</span></button>
              </td></tr>
            ) : null,
          ]))}
        </tbody></table>
        <button type="button" className="btn btn-info refreshWiFiNetworks" onClick={() => emit('getWirelessNetworks', '')}><Icon name="refresh" /> <span>Refresh</span></button>
      </div>
    </div>
  );
}

const COLORS = ['#000', '#999', '#CCC', '#C44', '#CAF', '#388'];
export function UiSettingsSection() {
  const ui = useUiSettings(s => s.settings);
  const backgrounds = useUiSettings(s => s.backgrounds);
  const [pct, setPct] = useState(0);
  const custom0 = ui.color && COLORS.indexOf(ui.color) < 0 ? ui.color : '#DDD';
  const [custom, setCustom] = useState<string>(custom0);
  useEffect(() => { emit('getBackgrounds'); }, []);
  const pick = (file: File | null) => { if (!file) { return; } upload(HOST + '/backgrounds-upload', file, setPct).then(() => setPct(0)).catch(() => setPct(0)); };
  const current = (ui.background && ui.background.title) || '';
  return (
    <div id="uiSettings" className="panel panel-default">
      <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-paint-brush" /> <span>Theme Settings</span></h3></div>
      <div className="panel-body">
        <h4 className="sectionDescription">Click and select new background or drop it here.</h4>
        {!pct ? <label className="uploadDroppableArea"><input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => pick(e.target.files ? e.target.files[0] : null)} /><span>Click and select new background or drop it here.</span></label> : null}
        {pct > 0 ? <div id="installProgressBar"><h3>Click and select new background or drop it here.</h3><Progress value={pct} /></div> : null}
        <hr />
        <h4 className="sectionDescription">Select background</h4>
        <div id="backgroundSelector" className="row">
          {((backgrounds && backgrounds.list) || []).map((bg: any, i: number) => (
            <div className="col-sm-6" key={i}><div className="background">
              <img onClick={() => emit('setBackgrounds', bg)} className={current === bg.name ? 'current' : ''} src={bg.thumbnail} alt={bg.name} />
              <div className="backgroundName"><span className={current === bg.name ? 'current' : ''}>{bg.name}</span>
                {current !== bg.name ? <p><button type="button" className="btn btn-info" onClick={() => emit('setBackgrounds', bg)} title="Apply background"><Icon name="check" /></button>{!bg.notDeletable ? <button type="button" className="btn btn-danger" onClick={() => emit('deleteBackground', bg)} title="Delete background"><Icon name="delete" /></button> : null}</p> : null}
              </div>
            </div></div>
          ))}
        </div>
        <hr />
        <h4 className="sectionDescription">Select background color</h4>
        <div id="backgroundColorSelector" className="row"><div className="col-xs-24" id="colorPalette">
          {COLORS.map(c => <div key={c} className={c === ui.color ? 'selected' : ''} style={{ backgroundColor: c }}><button type="button" className="btn btn-info" onClick={() => emit('setBackgrounds', { color: c })} title="Apply background color"><Icon name="check" /></button></div>)}
          <div style={{ backgroundColor: custom }} className={ui.color && custom === ui.color ? 'selected' : ''}>
            <button type="button" className="btn btn-info customColor" onClick={() => { if (custom.length >= 4) { emit('setBackgrounds', { color: custom }); } }} title="Apply background color"><Icon name="check" /></button>
            <input type="text" className="form-control" value={custom} onChange={(e) => setCustom(e.target.value)} />
          </div>
        </div></div>
      </div>
    </div>
  );
}

export function FirmwareUpload() {
  const pick = (file: File | null) => {
    if (!file) { return; }
    useModal.getState().open('updater', { title: 'Uploading Firmware File', description: 'Uploading Firmware File', progress: 0 });
    upload(HOST + '/firmware-upload', file, (p) => useModal.setState(s => s.name === 'updater' ? { data: { ...s.data, progress: p } } : {})).then(() => useModal.getState().close()).catch(() => useModal.getState().close());
  };
  return (
    <div id="firmwareUploadPlugin" className="panel panel-default">
      <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-upload" /> Update firmware via file</h3></div>
      <div className="panel-body">Update system's firmware via local firmware file<br /><br />
        <form onSubmit={(e) => e.preventDefault()}><label className="btn btn-info"><input type="file" style={{ display: 'none' }} onChange={(e) => pick(e.target.files ? e.target.files[0] : null)} /><Icon name="upload" /> Choose File</label></form>
      </div>
    </div>
  );
}

export const CORE: Record<string, () => React.ReactElement> = { 'system-version': SystemVersion, 'network-status': NetworkStatus, 'my-music': MyMusic, 'my-music-plugin-enabler': MyMusicPluginEnabler, 'network-drives': NetworkDrives, wifi: Wifi, 'ui-settings': UiSettingsSection, 'firmware-upload': FirmwareUpload };
