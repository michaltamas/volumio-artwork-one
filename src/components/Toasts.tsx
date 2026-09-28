/** The player's messages, as the theme's toast cards (mockup "Toasts"): icon tile, eyebrow, message, progress. */
import { useEffect, useState } from 'react';
import { useToasts } from '../core/store/toast';

function Bar({ timeout, born }: { timeout: number; born: number }) {
  const [w, setW] = useState(100);
  useEffect(() => {
    let raf = 0;
    const tick = () => { const left = Math.max(0, 1 - (Date.now() - born) / timeout); setW(left * 100); if (left > 0) { raf = requestAnimationFrame(tick); } };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeout, born]);
  return <div className="toast-progress" style={{ width: w + '%' }} />;
}

export default function Toasts() {
  const toasts = useToasts(s => s.toasts);
  if (!toasts.length) { return null; }
  return (
    <div id="toast-container" className="toast-top-right">
      {toasts.map(t => (
        <div key={t.key} className={'toast toast-' + t.type} role="status">
          <div className="toast-body">
            {t.title ? <div className="toast-title">{t.title}</div> : null}
            {t.message ? <div className="toast-message">{t.message}</div> : null}
          </div>
          {t.sticky ? <button type="button" className="toast-close-button" onClick={() => useToasts.getState().close(t.key)} aria-label="Close" /> : null}
          {!t.sticky ? <Bar timeout={t.timeout} born={t.born} /> : null}
        </div>
      ))}
    </div>
  );
}
