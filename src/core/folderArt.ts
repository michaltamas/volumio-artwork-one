/**
 * Whether the album art server has a real picture at an address. For a folder without a cover
 * it answers with its icon as an SVG (`image/svg+xml`), a cover is a JPEG or PNG: one HEAD
 * request tells them apart, the answer is kept for the session. On a network error the picture
 * is assumed real, so nothing is hidden by a hiccup.
 */
const known = new Map<string, Promise<boolean>>();
// a folder of folders asks for every card at once: a few at a time, so the player's art server is not flooded
const AT_ONCE = 4;
let running = 0;
const waiting: (() => void)[] = [];
const turn = (): Promise<void> => new Promise((go) => { if (running < AT_ONCE) { running++; go(); } else { waiting.push(go); } });
const done = () => { const next = waiting.shift(); if (next) { next(); } else { running--; } };

export function isRealArt(url: string): Promise<boolean> {
  let p = known.get(url);
  if (!p) {
    p = turn().then(() => fetch(url, { method: 'HEAD' })).then(r => !/svg/i.test(r.headers.get('content-type') || '')).catch(() => true).then((ok) => { done(); return ok; });
    known.set(url, p);
  }
  return p;
}
