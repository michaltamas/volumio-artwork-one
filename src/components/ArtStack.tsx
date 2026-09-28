/** The full-frame blurred cover behind every screen (spec §4), and the palette sampled from it. */
import { useEffect } from 'react';
import { usePlayer } from '../core/store/player';
import { useTheme } from '../core/store/theme';
import { albumart } from '../core/api';
import { sampleCover } from '../core/palette';
import { bakedCover, bakedCoverSync } from '../core/artBlur';
import { useState } from 'react';


const washSaturate = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wash-saturate')) || 1;
const washBox = () => Math.max(window.innerWidth, window.innerHeight) * 1.5;   // the 150% box the filter blurs against

export default function ArtStack() {
  const art = usePlayer(s => s.state.albumart);
  const url = albumart(art);
  const choice = useTheme(s => s.choice);
  const followed = useTheme(s => s.followed);
  const light = useTheme.getState().isLight();
  useEffect(() => { if (url) { sampleCover(url, light); } }, [url, light, choice, followed]);
  const [baked, setBaked] = useState<{ url: string; src: string } | null>(() => {
    // a stack mounted for a cover already baked (the leaving sheet) starts with it: no frame of the browser's filter
    if (!url) { return null; }
    const src = bakedCoverSync(url, washSaturate(), washBox());
    return src ? { url, src } : null;
  });
  useEffect(() => {
    if (!url) { return; }
    let alive = true;
    const sat = washSaturate(), box = washBox();
    bakedCover(url, sat, box).then(src => { if (alive) { setBaked({ url, src }); } }).catch(() => { if (alive) { setBaked(null); } });
    return () => { alive = false; };
  }, [url, light, choice, followed]);
  // the wash is baked once per cover (see artBlur.ts); until it is ready the cover shows through the browser's filter
  const src = baked && baked.url === url ? baked.src : url;
  return (
    <div className="art-stack" aria-hidden="true">
      {url ? <img className={'art-bg' + (baked && baked.url === url ? ' art-bg--baked' : '')} src={src} alt="" /> : null}
      <div className="art-scrim" />
    </div>
  );
}
