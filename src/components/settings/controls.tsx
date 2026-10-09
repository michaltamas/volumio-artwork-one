/** The shared form controls of the settings pages: the switch, the select (segment for ≤3 options), the file field. */
import Icon from '../Icon';

export function Switch({ on, onChange, label, noLabel }: { on: boolean; onChange: (v: boolean) => void; label?: string; noLabel?: boolean }) {
  return (
    <div className={'bootstrap-switch' + (on ? ' bootstrap-switch-on' : '') + (noLabel ? ' bootstrap-switch--bare' : '')}>
      <input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
    </div>
  );
}

export type Option = { label?: string; value?: any } | string;
const optLabel = (o: Option) => typeof o === 'string' ? o : String(o.label ?? o.value ?? '');
const optVal = (o: Option) => typeof o === 'string' ? o : (o.value !== undefined ? o.value : o.label);
// values compare as text: a plugin may keep 0 in its options and "0" in its config (FusionDsp's attenuation)
const eq = (a: any, b: any) => a === b || (a !== null && b !== null && a !== undefined && b !== undefined && typeof a !== 'object' && typeof b !== 'object' && String(a) === String(b));
export function same(v: any, o: Option): boolean { if (eq(v, o)) { return true; } if (v && typeof v === 'object' && v.value !== undefined && typeof o === 'object') { return eq(v.value, o.value); } return typeof o !== 'object' ? eq(v, o) : false; }

export function Select({ value, options, onChange, label, className, placeholder, byLabel }: { value: any; options: Option[]; onChange: (o: Option) => void; label?: string; className?: string; placeholder?: string; byLabel?: boolean }) {
  // The value says which option is chosen; when several share it ("Audio Jack" and "HDMI Out"), the label picks among them.
  // A field whose value does not tell the options apart at all says so with byLabel: the I2S DAC saves its overlay, which
  // "R-PI DAC" and "BassFly-uHAT" share, and an option's own value ("bassfly") is not what is saved. Its label is the truth.
  const lab = value && typeof value === 'object' && value.label !== undefined ? value.label : undefined;
  const hasLabel = (o: Option) => typeof o === 'object' && lab !== undefined && o.label === lab;
  const byValue = () => { const m = options.map((o, i) => (same(value, o) ? i : -1)).filter(i => i > -1); return m.find(i => hasLabel(options[i])) ?? (m.length ? m[0] : -1); };
  let idx = byLabel && lab !== undefined ? options.findIndex(hasLabel) : -1;
  if (idx < 0) { idx = byValue(); }
  return (
    <div className={'ui-select-container ui-select-bootstrap' + (className ? ' ' + className : '')}>
      <select value={idx < 0 ? '' : String(idx)} onChange={(e) => onChange(options[Number(e.target.value)])} aria-label={label}>
        {/* a value none of the options carries (a filter named with $samplerate$, a file since removed):
            its own label, as Volumio's interfaces show it; the placeholder only when it has none */}
        {idx < 0 ? <option value="">{lab !== undefined && lab !== null && String(lab) !== '' ? String(lab) : (placeholder || '')}</option> : null}
        {options.map((o, i) => <option key={i} value={i}>{optLabel(o)}</option>)}
      </select>
      <span className="caret" />
    </div>
  );
}
export { optLabel, optVal };

export function Segment({ value, options, onChange, label }: { value: any; options: Option[]; onChange: (o: Option) => void; label?: string }) {
  return (
    <div className="aw-segment" role="radiogroup" aria-label={label}>
      {options.map((o, i) => <button key={i} type="button" className={'aw-segment__opt' + (same(value, o) ? ' active' : '')} role="radio" aria-checked={same(value, o)} onClick={() => onChange(o)}>{optLabel(o)}</button>)}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return <div className="progress progress-striped active"><div className="progress-bar" style={{ width: value + '%' }}>{value}%</div></div>;
}

// upload a file as multipart form data ("filename"), with progress
export function upload(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) { onProgress(Math.round(100 * e.loaded / e.total)); } };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error('upload failed'));
    const fd = new FormData(); fd.append('filename', file);
    xhr.send(fd);
  });
}

export function Fa({ name, className }: { name: string; className?: string }) { return <Icon name={name} className={className} />; }
