/** The sleep timer sheet (handoff 9a): four presets, a custom length, what happens when it ends, Start; running: the countdown and Turn off. */
import { useState } from 'react';
import Icon from '../Icon';
import { useModal } from '../../core/store/modal';
import { useSleep } from '../../core/store/sleep';
import { useToasts } from '../../core/store/toast';
import { useUndo } from '../../core/store/undo';

const PRESETS = [15, 30, 45, 60];

export default function SleepSheet() {
  const sleep = useSleep();
  const running = sleep.running();
  const [minutes, setMinutes] = useState(30);
  const [customOn, setCustomOn] = useState(false);
  const [custom, setCustom] = useState('');
  const [action, setAction] = useState<'stop' | 'poweroff'>(sleep.action);
  const close = () => useModal.getState().close();
  const pickCustom = (v: string) => { setCustom(v); const m = parseInt(v.replace(/\D/g, ''), 10); setCustomOn(true); setMinutes(m > 0 ? Math.min(m, 24 * 60 - 1) : 0); };
  const start = () => {
    if (!minutes) { return; }
    sleep.start(minutes, action);
    useToasts.getState().show('info', (action === 'poweroff' ? 'Player powers off at ' : 'Music stops at ') + useSleep.getState().endsText(), 'Sleep timer');
    useUndo.getState().swallowNext();
    close();
  };
  const off = () => { sleep.off(); useToasts.getState().show('info', 'Timer off', 'Sleep timer'); useUndo.getState().swallowNext(); close(); };
  return (
    <div className={'aw-sheet aw-sheet--sleep' + (running ? ' is-running' : '')}>
      <div className="aw-sleep__head">
        <Icon name="bedtime" /><span className="mono">SLEEP TIMER</span>
        <button type="button" className="aw-sheet__close" onClick={close} aria-label="Close"><Icon name="close" /></button>
      </div>
      {!running ? (
        <div className="aw-sleep__choose">
          <div className="aw-sleep__grid" role="group" aria-label="Minutes">
            {PRESETS.map(m => <button key={m} type="button" className={'aw-sleep__preset mono' + (minutes === m && !customOn ? ' active' : '')} onClick={() => { setMinutes(m); setCustomOn(false); }}>{m}</button>)}
          </div>
          <div className="aw-sleep__unit mono">MINUTES</div>
          <label className={'aw-sleep__custom' + (customOn ? ' active' : '')}>
            <span>Custom</span>
            <span className="aw-sleep__custom-val mono"><input type="text" inputMode="numeric" maxLength={3} value={custom} onChange={(e) => pickCustom(e.target.value)} placeholder="—" aria-label="Custom minutes" /> MIN</span>
          </label>
          <div className="aw-sleep__rule" />
          <div className="aw-sleep__label">When it ends</div>
          <div className="aw-sleep__seg" role="group" aria-label="When it ends">
            <button type="button" className={action === 'stop' ? 'active' : ''} onClick={() => setAction('stop')}>Stop music</button>
            <button type="button" className={action === 'poweroff' ? 'active' : ''} onClick={() => setAction('poweroff')}>Power off</button>
          </div>
          <button type="button" className="aw-sleep__start" onClick={start} disabled={!minutes}>Start</button>
        </div>
      ) : (
        <div className="aw-sleep__run">
          <div className="aw-sleep__count mono">{sleep.countdown()}</div>
          <div className="aw-sleep__then mono">REMAINING · THEN {sleep.action === 'poweroff' ? 'POWER OFF' : 'STOP MUSIC'}</div>
          <div className="aw-sleep__bar"><div className="aw-sleep__bar-fill" style={{ width: sleep.progress() + '%' }} /></div>
          <div className="aw-sleep__ends mono">
            {sleep.startedText() ? <span>STARTED {sleep.startedText()}</span> : <span />}
            <span>ENDS {sleep.endsText()}</span>
          </div>
          <button type="button" className="aw-sleep__off" onClick={off}>Turn off timer</button>
        </div>
      )}
    </div>
  );
}
