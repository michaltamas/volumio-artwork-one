/**
 * The shared page head: fixed, carries the screen's top padding, blurs what scrolls under it
 * (twelve strips with a decreasing radius, each faded by its own mask). A page fills the nav
 * and actions slots; the menu button opens the phone menu.
 *
 * `position: fixed`, not `sticky`: Safari never repaints a sticky element's backdrop-filter as
 * content scrolls underneath it (confirmed — identical markup with `fixed` repaints correctly on
 * every scroll frame in the same engine; `transform: translateZ(0)`/`will-change` on either the
 * sticky element or the filtered strips does not help). A few contexts still need the head to sit
 * in normal flow instead (the wide 2-column album grid, where it's a non-scrolling grid cell) —
 * those override `position` back to `static` in their own stylesheet; this component doesn't know
 * about them. Since `fixed` takes the bar out of flow, this renders a spacer of the SAME height
 * right after it so the next element isn't pushed under it — and renders nothing when a
 * `position: static` override is in effect, since flow already reserves the space there.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Icon from './Icon';
import { useUi } from '../core/store/ui';

export default function PageHead({ variant, back, backLabel, nav, actions }: { variant?: string; back?: () => void; backLabel?: string; nav?: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [spacerH, setSpacerH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) { return; }
    const update = () => setSpacerH(getComputedStyle(el).position === 'fixed' ? el.offsetHeight : 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  return (
    <>
      <div ref={ref} className={'aw-head' + (variant ? ' aw-head--' + variant : '')}>
        <div className="aw-hblur" aria-hidden="true"><i /></div>
        <div className="aw-head__row">
          <button type="button" className="aw-menu-btn" onClick={() => useUi.getState().toggleMenu()} aria-label="Menu" title="Menu"><Icon name="menu" /></button>
          {back ? <button type="button" className="aw-head__back" onClick={back} aria-label={backLabel || 'Back'} title={backLabel || 'Back'}><Icon name="arrow_back" /></button> : null}
          <div className="aw-head__nav">{nav}</div>
          {actions ? <div className="aw-head__actions">{actions}</div> : null}
        </div>
      </div>
      {spacerH ? <div className="aw-head-spacer" style={{ height: spacerH }} aria-hidden="true" /> : null}
    </>
  );
}
