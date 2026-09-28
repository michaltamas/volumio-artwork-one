/**
 * Kiosk = a browser that is the player's own display: Volumio's kiosk user agent, a loopback
 * host, or `?kiosk=1` in the address (kept for the session, so a desktop browser can stand in).
 */
const KEY = 'aw-kiosk';
export function detectKiosk(): boolean {
  try {
    const asked = /[?&]kiosk=(1|0)\b/.exec(window.location.href);
    if (asked) { sessionStorage.setItem(KEY, asked[1]); }
    const kept = sessionStorage.getItem(KEY);
    if (kept === '1') { return true; }
    if (kept === '0') { return false; }
  } catch { /* no session storage */ }
  if (/volumiokiosk/i.test(navigator.userAgent || '')) { return true; }
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
}
export const KIOSK = detectKiosk();
