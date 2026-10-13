/**
 * Text shortened, with an ellipsis, to what fits a number of lines. CSS line-clamp cannot do it
 * cleanly for the display type: at a tight line height the descenders of the last line and the
 * ascenders of the hidden next one share the same strip, so any clip either cuts the g/y/p or
 * shows the tops of the hidden line. Here the text itself is shortened and nothing is clipped.
 * The element's own rules must not clamp or ellipsize it (the measuring copy takes them too).
 */
import { useLayoutEffect, useRef, useState, type ElementType } from 'react';

export default function ClampedText({ text, lines, className, as: Tag = 'div' }: { text: string; lines: number; className: string; as?: ElementType }) {
  const el = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(text);

  useLayoutEffect(() => {
    const h = el.current; const host = h?.parentElement;
    if (!h || !host) { setShown(text); return; }
    const fit = () => {
      // measured on a hidden copy in the same place, so it takes every rule the element takes
      const probe = h.cloneNode(false) as HTMLElement;
      probe.removeAttribute('title');
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:' + h.clientWidth + 'px';
      host.appendChild(probe);
      const cs = getComputedStyle(probe);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const fits = (s: string) => { probe.textContent = s; return probe.offsetHeight <= lh * lines + 1; };
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
    window.addEventListener('resize', fit);   // display sizes follow the window height too
    document.fonts?.ready.then(fit).catch(() => { /* measured with the fallback font: refits on the next resize */ });
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [text, lines]);

  return <Tag className={className} title={text} ref={el}>{shown}</Tag>;
}
