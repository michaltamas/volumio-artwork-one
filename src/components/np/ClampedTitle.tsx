/** The Now Playing title: three sizes by its length (volumio-nowplaying-5.html: short ≤ 12 characters, medium ≤ 28, long), two lines at most for the short and medium, three for the long (ClampedText shortens the text itself). */
import ClampedText from '../ClampedText';

export default function ClampedTitle({ text }: { text: string }) {
  const n = String(text || '').trim().length;
  const len = n <= 12 ? 's' : n <= 28 ? 'm' : 'l';
  return <ClampedText key={len} as="h1" className={'np-title np-len-' + len} text={text} lines={len === 'l' ? 3 : 2} />;
}
