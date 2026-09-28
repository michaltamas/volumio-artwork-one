/**
 * The sleep timer, as one thing every screen can read (handoff 9a/9b). Volumio's alarm-clock
 * plugin keeps the timer; it answers `getSleep` with what is left (to the minute) and the
 * action. This store asks when the socket comes up, after every change, and once a minute
 * while the timer runs; in between it counts down on its own clock.
 */
import { create } from 'zustand';
import { on, emit } from '../socket';

const POLL_MS = 60000;
type Action = 'stop' | 'poweroff';
interface SleepStore {
  enabled: boolean; action: Action; endsAt: number; startedAt: number; length: number; now: number;
  running: () => boolean; remainingMs: () => number; minutesLeft: () => number; countdown: () => string; progress: () => number; endsText: () => string; startedText: () => string;
  ask: () => void; start: (minutes: number, action: Action) => void; off: () => void;
}
let lastAsk = 0;
const hhmm = (ms: number) => { const d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };

export const useSleep = create<SleepStore>((set, get) => ({
  enabled: false, action: 'stop', endsAt: 0, startedAt: 0, length: 0, now: Date.now(),
  running: () => get().enabled && get().endsAt > Date.now(),
  remainingMs: () => get().running() ? Math.max(0, get().endsAt - Date.now()) : 0,
  minutesLeft: () => Math.ceil(get().remainingMs() / 60000),
  countdown: () => { const s = Math.floor(get().remainingMs() / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; const mm = (h ? (m < 10 ? '0' : '') : '') + m, ss = (r < 10 ? '0' : '') + r; return (h ? h + ':' : '') + mm + ':' + ss; },
  progress: () => { const L = get().length; return L ? Math.min(100, Math.max(0, 100 - get().remainingMs() / (L * 60000) * 100)) : 0; },
  endsText: () => get().endsAt ? hhmm(get().endsAt) : '',
  startedText: () => get().startedAt ? hhmm(get().startedAt) : '',
  ask: () => { lastAsk = Date.now(); emit('getSleep'); },
  start: (minutes, action) => {
    const m = Math.max(1, Math.min(24 * 60 - 1, Math.round(minutes)));
    const a: Action = action === 'poweroff' ? 'poweroff' : 'stop';
    emit('setSleep', { enabled: true, time: Math.floor(m / 60) + ':' + (m % 60), action: a });
    set({ enabled: true, action: a, startedAt: Date.now(), endsAt: Date.now() + m * 60000, length: m });
  },
  off: () => { emit('setSleep', { enabled: false, time: '0:0', action: get().action }); set({ enabled: false, endsAt: 0, startedAt: 0, length: 0 }); },
}));

on('pushSleep', (d: any) => {
  if (!d) { return; }
  const en = d.enabled !== undefined ? d.enabled : d.sleep_enabled;
  const action = d.action !== undefined ? d.action : d.sleep_action;
  if (en === undefined) { return; }
  const st = useSleep.getState();
  const enabled = en === true || en === 'true';
  const patch: Partial<SleepStore> = { enabled, action: action === 'poweroff' ? 'poweroff' : 'stop' };
  if (enabled && !d.time) { if (!st.endsAt) { useSleep.getState().ask(); } }
  else if (enabled && d.time) {
    const [h, m] = String(d.time).split(':').map(v => parseInt(v, 10) || 0);
    const left = (h * 60 + m + 1) * 60000;
    if (!(st.endsAt && Math.abs(st.endsAt - (Date.now() + left)) < 90000)) { patch.endsAt = Date.now() + left; }
    if (!st.length) { patch.length = h * 60 + m + 1; }
  } else { patch.endsAt = 0; patch.startedAt = 0; patch.length = 0; }
  lastAsk = Date.now();
  useSleep.setState(patch);
});
window.setInterval(() => {
  const st = useSleep.getState();
  if (!st.enabled) { return; }
  if (st.endsAt && Date.now() >= st.endsAt) { useSleep.setState({ enabled: false, endsAt: 0, startedAt: 0, length: 0 }); st.ask(); }
  else if (!lastAsk || Date.now() - lastAsk > POLL_MS) { st.ask(); }
  useSleep.setState({ now: Date.now() });
}, 1000);
useSleep.getState().ask();
