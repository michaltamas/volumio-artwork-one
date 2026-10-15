/**
 * One section of a settings page as a card (handoff 15): a header with its icon, name and one-line
 * description; rows of a label with its hint underneath and the control in a fixed track; a footer
 * that carries the section's save button, greyed until something in the card changes. A changed
 * card says so (its border goes to ink, the footer says UNSAVED and offers Cancel). On a narrow
 * column the label goes above wide controls (selects, text fields) and stays beside narrow ones.
 */
import type { ReactNode } from 'react';
import Icon from '../Icon';
import { Switch, Select, Segment, same } from './controls';

// a plugin's `attributes` on an input are HTML attributes as Volumio's Angular interface spread them:
// `style` as a CSS string (Now Playing: "margin-bottom: 32px;"), `readonly`, `maxlength`… React wants
// a style object and its own names, and throws on the string (error #62) — which left the page blank
function inputAttrs(attrs: any): Record<string, any> {
  const out: Record<string, any> = {};
  (Array.isArray(attrs) ? attrs : []).forEach((a: any) => {
    if (!a || typeof a !== 'object') { return; }
    Object.keys(a).forEach((k) => {
      const v = a[k];
      if (k === 'style') {
        if (typeof v === 'string') { const o: Record<string, string> = {}; v.split(';').forEach((d) => { const i = d.indexOf(':'); if (i > 0) { o[d.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = d.slice(i + 1).trim(); } }); out.style = { ...(out.style || {}), ...o }; }
        else if (v && typeof v === 'object') { out.style = { ...(out.style || {}), ...v }; }
        return;
      }
      const name: Record<string, string> = { readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', autocomplete: 'autoComplete', tabindex: 'tabIndex', class: 'className', for: 'htmlFor' };
      out[name[k.toLowerCase()] || k] = v;
    });
  });
  return out;
}

// how far an equalizer bar is filled, for the theme's slider track
const fillPct = (bar: any) => { const min = Number(bar.min) || 0, max = Number(bar.max), v = Number(bar.value); return max > min && Number.isFinite(v) ? Math.min(100, Math.max(0, (v - min) / (max - min) * 100)) + '%' : '0%'; };

// a button that leads somewhere (a page, a site, a sign-in) rather than doing something here
const NAV_TYPES = ['openUrl', 'goto', 'oauth', 'myVolumioUpgrade'];

export interface RowView {
  item: any;            // the plugin's item; its value is edited in place, as Volumio's interfaces do
  label: string;
  hint?: ReactNode;
  hintMono?: boolean;
  button?: string;      // the button's own text when it says more than the row's label
  changed?: boolean;    // its value differs from what the player sent
}

export interface CardView {
  key: string;
  id?: string;
  label: string;
  icon: string;
  description?: string;
  danger?: boolean;
  rows: RowView[];
  save?: string | null;  // the save button's label, when the card has settings to save
  core?: ReactNode;      // one of Volumio's own sections, drawn by the theme
  bare?: boolean;        // a core section that is its own card (the network's status tiles): no frame
  action?: ReactNode;    // a control at the header's end
}

function Control({ row, onChange, onButton }: { row: RowView; onChange: () => void; onButton: (item: any) => void }) {
  const item = row.item;
  if (item.element === 'input') {
    return <input id={item.id} type={item.type} className="aw-sc-input" value={item.value ?? ''} onChange={(e) => { item.value = item.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value; onChange(); }} aria-label={row.label} {...inputAttrs(item.attributes)} />;
  }
  if (item.element === 'switch') {
    const on = item.value === true || item.value === 'true';
    return (
      <div className="aw-sc-switch">
        <span className="aw-sc-switch__state">{on ? 'On' : 'Off'}</span>
        <Switch on={on} onChange={(v) => { item.value = v; onChange(); }} label={row.label} noLabel />
      </div>
    );
  }
  if (item.element === 'select') {
    // two or three choices as a segment, but only for a value one of them carries: a segment cannot
    // show anything else, the select shows the value's own label (as Volumio does)
    const seg = item.options && item.options.length > 1 && item.options.length <= 3 && item.options.some((o: any) => same(item.value, o) || (item.value && typeof item.value === 'object' && o && typeof o === 'object' && o.label === item.value.label));
    return seg
      ? <Segment value={item.value} options={item.options} onChange={(o) => { item.value = o; onChange(); }} label={row.label} />
      : <Select value={item.value} options={item.options || []} onChange={(o) => { item.value = o; onChange(); }} label={row.label} placeholder="Enter an address..." byLabel={item.id === 'i2sid'} />;
  }
  if (item.element === 'button') {
    const c = item.onClick || {};
    const nav = NAV_TYPES.indexOf(c.type) > -1;
    const danger = !!c.askForConfirm;
    // a button that only repeats its row's label says what it does instead: it opens, or it runs
    const text = row.button || (nav ? 'Open' : danger ? 'Run…' : 'Run');
    return (
      <button id={item.id} type="button" name={item.id} className={'aw-sc-pill' + (nav ? ' aw-sc-pill--open' : '') + (danger ? ' aw-sc-pill--danger' : '')} onClick={() => onButton(item)} aria-label={row.label}>
        <span className="aw-sc-pill__text">{text}</span>{nav ? <Icon name="chevron_right" /> : null}
      </button>
    );
  }
  return null;
}

function Equalizer({ item, onChange }: { item: any; onChange: () => void }) {
  return (
    <div className="aw-sc-eq equalizer-plugin"><div className="equalizer-bars">
      {((item.config && item.config.bars) || []).map((bar: any, bi: number) => (
        <div className={'equalizer ' + ((item.config && item.config.orientation) || 'vertical')} key={bi}>
          <label className="equalizer-label">{bar.ticksLabels && bar.ticksLabels[0]}</label>
          <input type="range" min={bar.min} max={bar.max} step={bar.step} value={bar.value} onChange={(e) => { bar.value = Number(e.target.value); onChange(); }} aria-label={bar.ticksLabels && bar.ticksLabels[0]} style={{ ['--aw-fill' as any]: fillPct(bar) }} />
        </div>
      ))}
    </div></div>
  );
}

export function Row({ row, onChange, onButton }: { row: RowView; onChange: () => void; onButton: (item: any) => void }) {
  const el = row.item.element;
  const seg = el === 'select' && row.item.options && row.item.options.length > 1 && row.item.options.length <= 3;
  // wide controls take the label above them on a narrow column; a link row is one tap target there
  const kind = el === 'equalizer' ? 'eq' : el === 'input' || (el === 'select' && !seg) ? 'wide' : el === 'select' ? 'seg' : el === 'button' && NAV_TYPES.indexOf((row.item.onClick || {}).type) > -1 ? 'link' : 'narrow';
  return (
    <div className={'aw-sc-row aw-sc-row--' + kind + (row.changed ? ' is-changed' : '')} data-row-id={row.item.id}>
      <div className="aw-sc-row__text">
        <label className="aw-sc-row__label" htmlFor={el === 'input' ? row.item.id : undefined}>{row.label}</label>
        {row.hint ? <div className={'aw-sc-row__hint' + (row.hintMono ? ' mono' : '')}>{row.hint}</div> : null}
      </div>
      {kind === 'eq' ? <Equalizer item={row.item} onChange={onChange} /> : <div className="aw-sc-row__control"><Control row={row} onChange={onChange} onButton={onButton} /></div>}
    </div>
  );
}

export default function SettingsCard({ card, dirty, onChange, onButton, onSave, onCancel }: { card: CardView; dirty: boolean; onChange: () => void; onButton: (item: any) => void; onSave: () => void; onCancel: () => void }) {
  if (card.bare) { return <section className="aw-sc-bare" data-section-id={card.id}>{card.core}</section>; }
  return (
    <section className={'aw-sc' + (dirty ? ' is-dirty' : '') + (card.danger ? ' aw-sc--danger' : '') + (card.core ? ' aw-sc--core' : '')} data-section-id={card.id}>
      {card.label ? (
        <header className="aw-sc__head">
          <span className="aw-sc__icon"><Icon name={card.icon} /></span>
          <div className="aw-sc__titles">
            <h3 className="aw-sc__title">{card.label}</h3>
            {card.description ? <p className="aw-sc__desc">{card.description}</p> : null}
          </div>
          {card.action}
        </header>
      ) : null}
      {card.core ? <div className="aw-sc__core">{card.core}</div> : null}
      {card.rows.length ? <div className="aw-sc__rows">{card.rows.map((r, i) => <Row key={r.item.id || i} row={r} onChange={onChange} onButton={onButton} />)}</div> : null}
      {card.save ? (
        <footer className="aw-sc__foot">
          {dirty ? <span className="aw-sc__status mono"><i aria-hidden="true" />UNSAVED</span> : null}
          {dirty ? <button type="button" className="aw-sc__cancel" onClick={onCancel}>Cancel</button> : null}
          <button type="button" className={'aw-sc__save' + (dirty ? ' is-on' : '')} onClick={onSave}>{card.save}</button>
        </footer>
      ) : null}
    </section>
  );
}
