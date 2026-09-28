/**
 * The theme's one spinner: a ring drawn in CSS. The font glyph (progress_activity) does not sit at
 * the centre of its box, so it wobbled when rotated; a bordered circle always turns on its centre.
 */
export default function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  size = Math.round(size / 2) * 2;   // even: an odd ring centres on half a pixel and shimmers when turned
  return <span className={'aw-spinner' + (className ? ' ' + className : '')} style={{ ['--aw-spinner' as any]: size + 'px' }} aria-hidden="true" />;
}
