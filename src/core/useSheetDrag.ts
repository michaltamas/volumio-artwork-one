/**
 * Pull a bottom sheet down to dismiss it. On the handle: while the finger moves the sheet
 * follows it, and on release it either flies out and closes or springs back. Only where the
 * sheet is a bottom sheet (phone portrait); elsewhere the handle stays a plain button.
 */
import { useCallback, useRef } from 'react';

const CLOSE_AT = 90;
export const PHONE = '(max-width: 700px) and (orientation: portrait)';

export function useSheetDrag(sheetRef: React.RefObject<HTMLElement | null>, onClose: () => void) {
  const dy = useRef(0);
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!window.matchMedia(PHONE).matches) { return; }
    const panel = sheetRef.current; if (!panel) { return; }
    const handle = e.currentTarget;
    const startY = e.clientY, startAt = Date.now();
    dy.current = 0;
    panel.style.transition = 'none';
    try { handle.setPointerCapture(e.pointerId); } catch { /* older engines */ }
    const move = (ev: PointerEvent) => { dy.current = Math.max(0, ev.clientY - startY); panel.style.transform = 'translateY(' + dy.current + 'px)'; };
    const end = () => {
      handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end);
      const speed = dy.current / Math.max(1, Date.now() - startAt);
      const flicked = dy.current > 30 && speed > 0.45;
      panel.style.transition = 'transform .2s ease-out';
      if (dy.current > CLOSE_AT || flicked) {
        panel.style.transform = 'translateY(100%)';
        window.setTimeout(() => { panel.style.transition = ''; panel.style.transform = ''; onClose(); }, 180);
      } else {
        panel.style.transform = '';
        window.setTimeout(() => { panel.style.transition = ''; }, 220);
      }
    };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  }, [sheetRef, onClose]);
  // a drag must not also count as the handle's tap
  const onClick = useCallback((e: React.MouseEvent) => { if (dy.current > 6) { e.preventDefault(); e.stopPropagation(); dy.current = 0; return; } onClose(); }, [onClose]);
  return { onPointerDown, onClick };
}
