/** The Alarms sheet (Dialogs mockup): the real alarms {enabled, time, playlist}; NEXT derived from the enabled ones. */
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useModal } from '../../core/store/modal';
import { usePlaylists } from '../../core/store/playlists';
import { on, emit } from '../../core/socket';

interface Alarm { id?: string; enabled: boolean; time: string | Date; playlist: string }

function alarmDate(a: Alarm): Date {
  if (!(a.time instanceof Date)) { const d = a.time ? new Date(a.time) : new Date(); if (isNaN(d.getTime())) { const n = new Date(); n.setSeconds(0, 0); a.time = n; } else { a.time = d; } }
  return a.time as Date;
}
const two = (n: number) => ('0' + n).slice(-2);

export default function AlarmSheet() {
  const data = useModal(s => s.data) || {};
  const playlists = usePlaylists(s => s.playlists);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  useEffect(() => { const off = on('pushAlarm', (d: any) => setAlarms(Array.isArray(d) ? d : [])); emit('getAlarms'); return off; }, []);
  const close = () => useModal.getState().close();
  const save = () => { emit('saveAlarm', alarms); close(); };
  const update = () => setAlarms(a => a.slice());
  const step = (a: Alarm, unit: 'h' | 'm', delta: number) => { const d = alarmDate(a); if (unit === 'h') { d.setHours((d.getHours() + delta + 24) % 24); } else { d.setMinutes((d.getMinutes() + delta + 60) % 60); } a.time = new Date(d.getTime()); update(); };
  const part = (a: Alarm, unit: 'h' | 'm') => { const d = alarmDate(a); return two(unit === 'h' ? d.getHours() : d.getMinutes()); };
  const next = (() => {
    const now = new Date(); let best: Date | null = null;
    alarms.forEach(a => { if (!a.enabled || !a.time) { return; } const d = alarmDate(a); const t = new Date(now); t.setHours(d.getHours(), d.getMinutes(), 0, 0); if (t <= now) { t.setDate(t.getDate() + 1); } if (!best || t < best) { best = t; } });
    if (!best) { return ''; }
    const b = best as Date;
    return (b.getDate() !== now.getDate() ? 'TOMORROW ' : 'TODAY ') + two(b.getHours()) + ':' + two(b.getMinutes());
  })();
  const stepper = (a: Alarm, unit: 'h' | 'm', label: string) => (
    <div className="aw-stepper__col">
      <button type="button" onClick={() => step(a, unit, 1)} aria-label={(unit === 'h' ? 'Hours' : 'Minutes') + ' up'}><Icon name="keyboard_arrow_up" /></button>
      <span className="aw-stepper__num mono">{part(a, unit)}</span>
      <button type="button" onClick={() => step(a, unit, -1)} aria-label={(unit === 'h' ? 'Hours' : 'Minutes') + ' down'}><Icon name="keyboard_arrow_down" /></button>
      <span className="aw-stepper__unit mono">{label}</span>
    </div>
  );
  return (
    <div className="aw-sheet aw-sheet--alarms">
      <div className="aw-sheet__head">
        <Icon name="alarm" className="aw-sheet__icon" />
        <div className="aw-sheet__titles"><div className="aw-sheet__title">{data.name || 'Alarm'}</div></div>
        <button type="button" className="aw-sheet__close" onClick={close} aria-label="Close"><Icon name="close" /></button>
      </div>
      <div className="aw-sheet__body aw-sheet__body--alarms">
        {!playlists.length ? <p className="aw-sheet__note">In order to use Alarm Clock, you must create at least one Playlist first</p> : null}
        {playlists.length ? (
          <div>
            {alarms.length ? <div className="aw-sheet__eyebrow mono">SCHEDULED</div> : null}
            {alarms.map((a, i) => (
              <div key={i} className={'aw-alarm' + (!a.enabled ? ' aw-alarm--off' : '')}>
                <div className="aw-stepper aw-stepper--bare">
                  {stepper(a, 'h', 'HRS')}
                  <span className="aw-stepper__colon mono">:</span>
                  {stepper(a, 'm', 'MIN')}
                </div>
                <div className="aw-alarm__what">
                  <div className="ui-select-container ui-select-bootstrap aw-sheet__select aw-sheet__select--sm">
                    <select value={a.playlist || ''} onChange={(e) => { a.playlist = e.target.value; update(); }} aria-label="Playlist">
                      <option value="" disabled>Choose Playlist</option>
                      {playlists.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <span className="caret" />
                  </div>
                </div>
                <div className={'bootstrap-switch' + (a.enabled ? ' bootstrap-switch-on' : '')}>
                  <input type="checkbox" checked={!!a.enabled} onChange={(e) => { a.enabled = e.target.checked; update(); }} aria-label="Enabled" />
                </div>
                <button type="button" className="aw-alarm__delete" onClick={() => setAlarms(list => list.filter(x => x !== a))} title="Delete" aria-label="Delete"><Icon name="delete" /></button>
              </div>
            ))}
            <button type="button" className="aw-alarm__add" onClick={() => setAlarms(list => [...list, { enabled: true, time: '', playlist: '' }])}><Icon name="add" /><span>Add</span></button>
          </div>
        ) : null}
      </div>
      <div className="aw-sheet__foot">
        {next ? <div className="aw-sheet__status"><span className="aw-sheet__dot aw-sheet__dot--on" /><span className="mono">NEXT — {next}</span></div> : null}
        <button type="button" className="aw-sheet__btn" onClick={close}><span>Cancel</span></button>
        {playlists.length ? <button type="button" className="aw-sheet__btn aw-sheet__btn--primary" onClick={save}><span>Save</span></button> : null}
      </div>
    </div>
  );
}
