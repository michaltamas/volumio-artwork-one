/**
 * The ground sampled from the cover (spec §4.3): the scrim's two tinted stops and the colour
 * the browser paints its own bands with (status bar, overscroll). Dark and light sample the
 * cover to different ends of the scale.
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { if (t < 0) { t += 1; } if (t > 1) { t -= 1; }
    if (t < 1 / 6) { return p + (q - p) * 6 * t; } if (t < 1 / 2) { return q; } if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; } return p; };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}

let lastUrl = '';
let lastLight: boolean | null = null;

export function sampleCover(url: string, light: boolean): void {
  if (!url) { return; }
  if (url === lastUrl && light === lastLight) { return; }
  lastUrl = url; lastLight = light;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const n = 16;
      const cv = document.createElement('canvas'); cv.width = n; cv.height = n;
      const ctx = cv.getContext('2d'); if (!ctx) { return; }
      ctx.drawImage(img, 0, 0, n, n);
      const data = ctx.getImageData(0, 0, n, n).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (l < 24 || l > 230) { continue; }
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (!count) { return; }
      const hsl = rgbToHsl(r / count, g / count, b / count);
      const h = Math.round(hsl[0] * 360);
      const s = Math.round(Math.min(0.16, Math.max(0.05, hsl[1])) * 100);
      const root = document.documentElement.style;
      root.setProperty('--art-1', `hsl(${h}, ${light ? Math.min(s, 22) : s}%, ${light ? 96 : 24}%)`);
      root.setProperty('--art-2', `hsl(${h}, ${light ? Math.min(s, 22) : s}%, ${light ? 93 : 17}%)`);
      const art2 = hslToRgb(h / 360, (light ? Math.min(s, 22) : s) / 100, light ? 0.94 : 0.17);
      const glass = light ? [250, 248, 245] : [10, 12, 15];
      const mix = art2.map((c, i) => Math.round(glass[i] * 0.9 + c * 0.1));
      const css = 'rgb(' + mix.join(',') + ')';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) { meta.setAttribute('content', css); }
      document.documentElement.style.backgroundColor = css;
      root.setProperty('--aw-band', css);
    } catch { /* cross-origin taint: the fixed scrim stays */ }
  };
  // a distinct URL for the CORS request, so Safari does not reuse the plain <img> load
  img.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'aw=palette';
}
