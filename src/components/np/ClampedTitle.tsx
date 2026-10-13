/** The Now Playing title, two lines at most (see ClampedText for why the text is shortened, not clipped). */
import ClampedText from '../ClampedText';

export default function ClampedTitle({ text }: { text: string }) {
  return <ClampedText as="h1" className="np-title" text={text} lines={2} />;
}
