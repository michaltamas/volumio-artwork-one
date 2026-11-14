/**
 * Whether the album art server has a real picture at an address. For a folder without a cover
 * it answers with its icon as an SVG (`image/svg+xml`), a cover is a JPEG or PNG: one HEAD
 * request tells them apart, the answer is kept for the session. On a network error the picture
 * is assumed real, so nothing is hidden by a hiccup.
 */
const known = new Map<string, Promise<boolean>>();

export function isRealArt(url: string): Promise<boolean> {
  let p = known.get(url);
  if (!p) {
    p = fetch(url, { method: 'HEAD' }).then(r => !/svg/i.test(r.headers.get('content-type') || '')).catch(() => true);
    known.set(url, p);
  }
  return p;
}
