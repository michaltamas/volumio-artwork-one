/** Volumio's small modals in the theme's dress: confirm, got it, password, the plugin installer, the updater, the NAS password. */
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { on, emit } from '../../core/socket';
import { useModal } from '../../core/store/modal';
import { Progress } from '../settings/controls';

export function ConfirmSheet() {
  const data = useModal(s => s.data) || {};
  const done = (ok: boolean) => { useModal.getState().close(); if (data.resolve) { data.resolve(ok); } };
  return (
    <>
      <div className={'modal-header' + (data.danger ? ' aw-modal--danger' : '')}><h3 className="modal-title"><i className="fa fa-info-circle"><Icon name="info" /></i> {data.title}</h3></div>
      <div className="modal-body">{data.message}</div>
      <div className="modal-footer"><button type="button" className="btn btn-warning" onClick={() => done(false)}>No</button><button type="button" className="btn btn-info" onClick={() => done(true)}>Yes</button></div>
    </>
  );
}
// an Angular state a plugin's button names, as a route here
const STATES: Record<string, string> = { 'volumio.playback': '/playback', 'volumio.browse': '/browse', 'volumio.queue': '/queue', 'volumio.settings': '/settings', 'volumio.multi-room': '/multi-room', 'volumio.plugin-manager': '/plugin-manager', 'volumio.home': '/home' };
export function GenericModalSheet() {
  const data = useModal(s => s.data) || {};
  const nav = useNavigate();
  // as Volumio's own interfaces: a message to the player, else an address (in this page), else a page of the interface; then closed
  const click = (b: any) => {
    if (b.emit) { emit(b.emit, b.payload); }
    else if (b.url) { window.open(b.url, '_self'); }
    else if (b.state && STATES[b.state]) { nav(STATES[b.state]); }
    useModal.getState().close();
  };
  const buttons = (data.buttons || []).map((b: any, i: number) => <button key={i} type="button" className={b.class || 'btn btn-info'} onClick={() => click(b)}>{b.name}</button>);
  if (data.progress) {
    const done = data.status === 'modalDone';
    const pct = Math.max(0, Math.min(100, Number(data.progressNumber) || 0));
    return (
      <>
        <div className="modal-header"><h3 className="modal-title">{data.title}</h3></div>
        <div className="modal-body">
          {done ? <h3>{data.message}</h3> : (
            <div>
              <h4>{data.message}</h4>
              <div className="progress progress-striped active"><div className="progress-bar" style={{ width: pct + '%' }}>{pct}%</div></div>
            </div>
          )}
        </div>
        <div className="modal-footer">{done ? buttons : null}</div>
      </>
    );
  }
  return (
    <>
      <div className="modal-header"><h3 className="modal-title"><i className="fa fa-info-circle"><Icon name="info" /></i> {data.title}</h3></div>
      <div className="modal-body" dangerouslySetInnerHTML={{ __html: String(data.message || '') }} />
      <div className="modal-footer">{buttons}</div>
    </>
  );
}
export function GotItSheet() {
  const data = useModal(s => s.data) || {};
  return (
    <>
      {data.title ? <div className="modal-header"><h3 className="modal-title"><i className="fa fa-info-circle"><Icon name="info" /></i> {data.title}</h3></div> : null}
      <div className="modal-body" dangerouslySetInnerHTML={{ __html: String(data.message || '') }} />
      <div className="modal-footer"><button type="button" className="btn btn-info" onClick={() => { useModal.getState().close(); if (data.onClose) { data.onClose(); } }}><span>Got it</span></button></div>
    </>
  );
}
export function PasswordSheet() {
  const data = useModal(s => s.data) || {};
  const [pw, setPw] = useState(''); const [err, setErr] = useState(false);
  useEffect(() => on('checkPassword', (ok: any) => { if (ok) { useModal.getState().close(); if (data.resolve) { data.resolve(true); } } else { setErr(true); } }), [data]);
  const cancel = () => { useModal.getState().close(); if (data.resolve) { data.resolve(false); } };
  return (
    <>
      <div className="modal-header"><h3 className="modal-title"><span>Enter password</span></h3></div>
      <div className="modal-body">
        {data.message ? <div>{data.message}<br /><br /></div> : null}
        <form className="form" onSubmit={(e) => { e.preventDefault(); if (pw) { setErr(false); emit('checkPassword', { password: pw, pluginName: data.pluginName }); } }}><input placeholder="Password" type="password" className="form-control" value={pw} onChange={(e) => setPw(e.target.value)} required /></form>
        {err ? <div><span>Invalid password</span></div> : null}
      </div>
      <div className="modal-footer"><button type="button" className="btn btn-warning" onClick={cancel}>Cancel</button><button type="button" className="btn btn-info" onClick={() => { if (pw) { setErr(false); emit('checkPassword', { password: pw, pluginName: data.pluginName }); } }}>Ok</button></div>
    </>
  );
}
export function InstallerSheet() {
  const initial = useModal(s => s.data);
  const [data, setData] = useState<any>(initial);
  const [log, setLog] = useState(false);
  useEffect(() => on('installPluginStatus', (d: any) => { setData(d); window.setTimeout(() => { const el = document.getElementById('advancedLogWrapper'); if (el) { el.scrollTop = el.scrollHeight; } }, 300); }), []);
  const d = data || {};
  return (
    <>
      <div className="modal-header"><h3 className="modal-title">{d.title}</h3></div>
      {data ? (
        <div className="modal-body">
          <p dangerouslySetInnerHTML={{ __html: String(d.message || '') }} />
          <div>{d.progress !== 100 ? <Progress value={Number(d.progress) || 0} /> : null}</div>
          {d.advancedLog ? <div>{d.progress !== 100 ? <a onClick={() => setLog(v => !v)}><span>{log ? '- Hide details' : '+ Show details'}</span></a> : null}<div id="advancedLogWrapper" style={{ display: log ? 'block' : 'none' }}><p dangerouslySetInnerHTML={{ __html: String(d.advancedLog) }} /></div></div> : null}
        </div>
      ) : null}
      <div className="modal-footer">{(d.buttons || []).map((b: any, i: number) => <button key={i} type="button" className={b.class} onClick={() => { if (b.emit) { emit(b.emit, b.payload); } useModal.getState().close(); }}>{b.name}</button>)}</div>
    </>
  );
}
export function UpdaterSheet() {
  const data = useModal(s => s.data) || {};
  const close = () => useModal.getState().close();
  // the firmware upload (Settings → System): a title, a line and a bar, no status
  if (!data.status) {
    return (
      <>
        <div className="modal-header"><h3 className="modal-title"><i className="fa fa-refresh"><Icon name="refresh" /></i> {data.title}</h3></div>
        <div className="modal-body"><div><h4>{data.description}</h4><Progress value={Number(data.progress) || 0} /></div></div>
        <div className="modal-footer" />
      </>
    );
  }
  // Volumio's updater (modal-updater.html)
  const ready = data.ready || {};
  const p = data.progressInfo || {};
  const done = data.done || {};
  const update = () => { if (ready.alternativeEmit) { emit(ready.alternativeEmit.message, ready.alternativeEmit.payload); } else { emit('update', { value: 'now' }); } };
  const pct = Math.max(0, Math.min(100, Number(p.progress) || 0));
  return (
    <>
      <div className="modal-header"><h3 className="modal-title"><i className="fa fa-refresh"><Icon name="refresh" /></i> {data.title}</h3></div>
      <div className="modal-body">
        {data.status === 'updateReady' ? <span dangerouslySetInnerHTML={{ __html: String(data.description || '') }} /> : null}
        {data.status === 'updateProgress' ? (
          <div>
            <h4>{p.status}</h4>
            <div className="progress progress-striped active"><div className="progress-bar" style={{ width: pct + '%' }}>{pct}%</div></div>
            {p.downloadSpeed ? <span>Download speed: {p.downloadSpeed} |</span> : null} {p.eta ? <span>Time remaining: {p.eta}</span> : null}
          </div>
        ) : null}
        {data.status === 'updateDone' ? <h3>{done.message}</h3> : null}
      </div>
      <div className="modal-footer">
        {data.status === 'updateReady' ? (ready.updateavailable
          ? <><button type="button" className="btn btn-warning" onClick={close}>Cancel</button> <button type="button" className="btn btn-primary" onClick={update}>Update now</button></>
          : <button type="button" className="btn btn-primary" onClick={close}>OK</button>) : null}
        {data.status === 'updateDone' ? (done.status === 'success'
          ? <button type="button" className="btn btn-primary" onClick={() => { emit('reboot'); close(); }}>Restart system</button>
          : (done.status === 'error' ? <button type="button" className="btn btn-primary" onClick={close}>OK</button> : null)) : null}
      </div>
    </>
  );
}
export function NasPasswordSheet() {
  const data = useModal(s => s.data) || {};
  const [user, setUser] = useState(String(data.username || '')); const [pw, setPw] = useState(String(data.password || '')); const [type, setType] = useState('password');
  const save = () => { emit('editShare', { id: data.id, name: data.name, username: user, password: pw }); useModal.getState().close(); };
  return (
    <>
      <div className="modal-header"><h3 className="modal-title"><i className="fa fa-info-circle"><Icon name="info" /></i> {data.title}</h3></div>
      <div className="modal-body">{data.message}<br />
        <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="form-group"><label className="control-label"><span>Username</span></label><input type="text" className="form-control" value={user} onChange={(e) => setUser(e.target.value)} required /></div>
          <div className="form-group"><label className="control-label"><span>Password</span></label><div className="input-group"><span className="input-group-addon clickable" onClick={() => setType(type === 'password' ? 'text' : 'password')}><Icon name={type === 'password' ? 'visibility' : 'visibility_off'} /></span><input type={type} className="form-control" value={pw} onChange={(e) => setPw(e.target.value)} required /></div></div>
        </form>
      </div>
      <div className="modal-footer"><button type="button" className="btn btn-warning" onClick={() => useModal.getState().close()}><span>Cancel</span></button><button type="button" className="btn btn-info" onClick={save}><span>Save</span></button></div>
    </>
  );
}
