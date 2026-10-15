/**
 * The favourite heart: the icon font's outline when the track is not a favourite, a filled heart when
 * it is. The theme's Material Symbols font is the static outline cut (no FILL axis), so the filled one
 * is drawn here, the font's own size (1em) and colour (currentColor).
 */
import Icon from './Icon';

export default function FavIcon({ on }: { on: boolean }) {
  if (!on) { return <Icon name="favorite" />; }
  return (
    <svg className="aw-fav-fill" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path fill="currentColor" d="M12 20.6a1.3 1.3 0 0 1-.9-.35l-1.1-1C5.2 14.9 2 12.05 2 8.5 2 5.6 4.3 3.3 7.2 3.3c1.65 0 3.25.77 4.3 2 1.05-1.23 2.65-2 4.3-2 2.9 0 5.2 2.3 5.2 5.2 0 3.55-3.2 6.4-8 10.75l-1.1 1a1.3 1.3 0 0 1-.9.35Z" />
    </svg>
  );
}
