/**
 * The Now Playing title, two lines at most. CSS line-clamp cannot do it cleanly here: at the
 * display size's .98 line height the descenders of line 2 and the ascenders of line 3 share the
 * same strip, so any clip either cuts the g/y/p or shows the tops of the hidden line. Instead the
 * text itself is shortened, with an ellipsis, to what fits two lines, and nothing is clipped.
 */
import { useLayoutEffect, useRef, useState } from 'react';

const LINES = 2;

export default function ClampedTitle({ text }: { text: string }) {
  const el = useRef<HTMLHeadingElement>(null);
  const [shown, setShown] = useState(text);

  useLayoutEffect(() => {
    const h = el.current; const host = h?.parentElement;
    if (!h || !host) { setShown(text); return; }
    const fit = () => {
      // measured on a hidden copy in the same place, so it takes every rule the title takes
      const probe = h.cloneNode(false) as HTMLHeadingElement;
      probe.removeAttribute('title');
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:' + h.clientWidth + 'px';
      host.appendChild(probe);
      const lh = parseFloat(getComputedStyle(probe).lineHeight) || parseFloat(getComputedStyle(probe).fontSize);
      const fits = (s: string) => { probe.textContent = s; return probe.offsetHeight <= lh * LINES + 1; };
      let out = text;
      if (!fits(text)) {
        let lo = 0, hi = text.length;
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (fits(text.slice(0, mid).trimEnd() + '…')) { lo = mid; } else { hi = mid - 1; } }
        out = text.slice(0, lo).trimEnd() + '…';
      }
      host.removeChild(probe);
      setShown(prev => prev === out ? prev : out);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(host);
    window.addEventListener('resize', fit);   // the display size follows the window height too
    document.fonts?.ready.then(fit).catch(() => { /* measured with the fallback font: refits on the next resize */ });
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [text]);

  return <h1 className="np-title" title={text} ref={el}>{shown}</h1>;
}
