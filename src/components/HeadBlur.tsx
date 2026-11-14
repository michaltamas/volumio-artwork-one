/**
 * The frosted strip under a bar that content scrolls beneath (the page head, Now Playing's bars): one
 * backdrop-filter layer with a gradient mask, fading out over the first rows (head.scss .aw-hblur).
 * `up` turns it for a bar at the bottom. The bar itself is `position: relative` with a z-index above
 * the scrolling content and carries the tint gradient (.aw-head::after, .aw-hbar::after).
 */
export default function HeadBlur({ up }: { up?: boolean }) {
  return <div className={'aw-hblur' + (up ? ' aw-hblur--up' : '')} aria-hidden="true"><i /></div>;
}
