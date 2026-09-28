/** A Material Symbols Rounded glyph by name. */
export default function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={'material-symbols-rounded' + (className ? ' ' + className : '')} aria-hidden="true">{name}</span>;
}
