/**
 * The frosted strip under the page head, which content scrolls beneath: one backdrop-filter layer with a
 * gradient mask, fading out over the first rows (head.scss .aw-hblur). The head is `position: relative`
 * with a z-index above the scrolling content and carries the tint gradient (.aw-head::after).
 */
export default function HeadBlur() {
  return <div className="aw-hblur" aria-hidden="true"><i /></div>;
}
