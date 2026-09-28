/**
 * The blurred cover, baked once: the cover drawn small, blurred there the way the browser's
 * filter would (a gaussian of 90px against the 150% box, fading into transparency past the
 * edges, then saturated), and stretched back. The browser never blurs a full-screen layer —
 * Safari does that in software and pays ~700ms every time its layer tree changes.
 */
const N = 64;              // the box, in cells
const cache = new Map<string, Promise<string>>();
const done = new Map<string, string>();   // the same, once resolved: for a second stack that must not wait a frame

function keyFor(url: string, saturate: number, boxPx: number): string {
  // the filter's 90px against the box's width, in cells; three passes of a box of this radius
  const sigma = 90 / boxPx * N;
  const r = Math.max(1, Math.round(sigma - 0.5));   // three boxes of width 2r+1: variance (w²-1)/4 = σ²
  return url + '|' + saturate + '|' + r;
}

// the baked wash when it is already there, else null (no work is started)
export function bakedCoverSync(url: string, saturate: number, boxPx: number): string | null {
  return done.get(keyFor(url, saturate, boxPx)) || null;
}

// three box blurs approximate a gaussian; transparent outside the box, premultiplied inside
function boxBlur(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h, lines = horizontal ? h : w;
  const step = horizontal ? 4 : w * 4, lineStep = horizontal ? w * 4 : 4;
  const norm = 1 / (2 * r + 1);
  for (let l = 0; l < lines; l++) {
    const base = l * lineStep;
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) { if (i >= 0 && i < len) { sum += src[base + i * step + c]; } }
      for (let i = 0; i < len; i++) {
        dst[base + i * step + c] = sum * norm;
        const out = i - r, inn = i + r + 1;
        if (out >= 0) { sum -= src[base + out * step + c]; }
        if (inn < len) { sum += src[base + inn * step + c]; }
      }
    }
  }
}

export function bakedCover(url: string, saturate: number, boxPx: number): Promise<string> {
  const key = keyFor(url, saturate, boxPx);
  const r = parseInt(key.slice(key.lastIndexOf('|') + 1), 10);
  const hit = cache.get(key); if (hit) { return hit; }
  const p = new Promise<string>((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
        const ctx = cv.getContext('2d'); if (!ctx) { return reject(new Error('no canvas')); }
        const s = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, s, s, 0, 0, N, N);
        const id = ctx.getImageData(0, 0, N, N), d = id.data;
        let a = new Float32Array(d.length), b = new Float32Array(d.length);
        for (let i = 0; i < d.length; i += 4) { const al = d[i + 3] / 255; a[i] = d[i] * al; a[i + 1] = d[i + 1] * al; a[i + 2] = d[i + 2] * al; a[i + 3] = al; }
        for (let pass = 0; pass < 3; pass++) { boxBlur(a, b, N, N, r, true); boxBlur(b, a, N, N, r, false); }
        for (let i = 0; i < d.length; i += 4) {
          const al = a[i + 3]; let rr = al ? a[i] / al : 0, gg = al ? a[i + 1] / al : 0, bb = al ? a[i + 2] / al : 0;
          const l = 0.213 * rr + 0.715 * gg + 0.072 * bb;   // the filter's saturate(), after the blur
          rr = l + (rr - l) * saturate; gg = l + (gg - l) * saturate; bb = l + (bb - l) * saturate;
          d[i] = Math.max(0, Math.min(255, rr)); d[i + 1] = Math.max(0, Math.min(255, gg)); d[i + 2] = Math.max(0, Math.min(255, bb)); d[i + 3] = Math.max(0, Math.min(255, al * 255));
        }
        ctx.putImageData(id, 0, 0);
        resolve(cv.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('cover'));
    img.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'aw=bake';
  });
  cache.set(key, p); p.then(src => done.set(key, src), () => cache.delete(key));
  return p;
}
