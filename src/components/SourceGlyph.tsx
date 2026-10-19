/**
 * A source's mark in the menu: the library's own by a glyph, a plugin's by its logo (a cloud when it
 * has none or it fails). A logo is a white mark on a transparent square with a wide empty margin of
 * its own (Spotify's fills 43% of it): it is drawn as a mask in the menu's ink — so it reads in the
 * light theme and takes the active colour like the glyphs — trimmed to the mark, at the glyphs' size.
 */
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { albumart } from '../core/api';
import { sourceGlyph } from '../core/store/menuSources';
import type { BrowseItem } from '../core/store/browse';

// a logo trimmed once per session: its src → a data URL of the mark alone ('' while it is read, or when it cannot be)
const trimmed = new Map<string, string>();

function trim(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth, h = img.naturalHeight;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); if (!g) { resolve(''); return; }
        g.drawImage(img, 0, 0);
        const a = g.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { if (a[(y * w + x) * 4 + 3] > 20) { if (x < x0) { x0 = x; } if (x > x1) { x1 = x; } if (y < y0) { y0 = y; } if (y > y1) { y1 = y; } } } }
        if (x1 < 0) { resolve(''); return; }
        const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
        out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
        resolve(out.toDataURL('image/png'));
      } catch { resolve(''); }   // a logo from elsewhere cannot be read: the untrimmed one is masked
    };
    img.onerror = () => reject(new Error('logo'));
    img.src = src;
  });
}

export default function SourceGlyph({ source }: { source: BrowseItem }) {
  const glyph = sourceGlyph(source.uri);
  const src = source.albumart && !glyph ? albumart(source.albumart) : '';
  const [mask, setMask] = useState(() => (src && trimmed.get(src)) || '');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!src) { return; }
    const known = trimmed.get(src);
    if (known !== undefined) { setMask(known); return; }
    let alive = true;
    trimmed.set(src, '');
    trim(src).then((url) => { trimmed.set(src, url); if (alive) { setMask(url); } }).catch(() => { trimmed.delete(src); if (alive) { setFailed(true); } });
    return () => { alive = false; };
  }, [src]);
  if (glyph) { return <Icon name={glyph} />; }
  if (!src || failed) { return <Icon name="cloud" />; }
  const url = 'url("' + (mask || src) + '")';
  return <span className={'aw-src-mark' + (mask ? '' : ' is-untrimmed')} style={{ WebkitMaskImage: url, maskImage: url }} aria-hidden="true" />;
}
