/**
 * The player cannot be reached: a dimmed layer over everything while the socket retries, with how
 * long it has been gone. A restart or an update takes minutes; after one the page may be stale,
 * so a Reload button comes up after 60 s.
 */
import { useEffect, useState } from 'react';
import Spinner from './Spinner';
import { useConnection } from '../core/store/connection';

const RELOAD_AFTER = 60;

function ago(s: number): string {
  if (s < 60) { return s + ' s'; }
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

export default function ConnectionLost() {
  const lost = useConnection(s => s.lost);
  const since = useConnection(s => s.since);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!lost) { return; }
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [lost]);
  if (!lost) { return null; }
  const secs = Math.max(0, Math.round((now - since) / 1000));
  return (
    <div className="aw-connlost" role="alertdialog" aria-live="assertive" aria-label="Connection lost">
      <div className="aw-connlost__card">
        <Spinner size={28} />
        <h2 className="aw-connlost__title">Connection lost</h2>
        <p className="aw-connlost__text">Trying to reconnect to Volumio…</p>
        <p className="aw-connlost__seen mono">LAST SEEN {ago(secs).toUpperCase()} AGO</p>
        <p className="aw-connlost__hint">If the device is restarting or updating, this can take a couple of minutes.</p>
        {secs >= RELOAD_AFTER ? <button type="button" className="aw-btn aw-btn--primary" onClick={() => window.location.reload()}><span>Reload</span></button> : null}
      </div>
    </div>
  );
}
