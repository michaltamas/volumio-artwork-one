/** A settings page generated from a plugin's UI config: sections of rows (input, switch, select, button), core sections, the save button. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import { emit, HOST } from '../core/socket';
import { askUiConfig, onUiConfig, pageKey } from '../core/uiConfig';
import { useSettings } from '../core/store/settings';
import { useUiSettings } from '../core/store/uiSettings';
import { useModal } from '../core/store/modal';
import { Switch, Select, Segment, same } from '../components/settings/controls';
import { CORE } from '../components/settings/CoreSections';
import AppearanceSlot from '../components/settings/AppearanceSlot';
import Spinner from '../components/Spinner';

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

function visible(item: any, section: any): boolean {
  if (item.hidden) { return false; }
  if (item.visibleIf) {
    const dep = (section.content || []).find((c: any) => c.id === item.visibleIf.field);
    if (!dep) { return false; }
    if (dep.value === item.visibleIf.value) { return true; }
    if (dep.value && typeof dep.value === 'object' && dep.value.value !== undefined && dep.value.value === item.visibleIf.value) { return true; }
    return false;
  }
  return true;
}

export default function PluginPage({ wizard }: { wizard?: boolean }) {
  const { pluginName = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const ui = useUiSettings(s => s.settings);
  const [obj, setObj] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [answered, setAnswered] = useState(false);   // the ask came back empty
  const takeRef = useRef<(d: any) => void>(() => {});
  const [, bump] = useState(0);
  const rerender = () => bump(n => n + 1);
  useEffect(() => {
    useSettings.setState({ route: { name: 'volumio.plugin', pluginName } });
    setObj(null); setShow(false);
    let alive = true;
    setAnswered(false);
    const take = (data: any) => {
      if (!alive) { return; }
      if (!data) { setAnswered(true); return; }   // the ask timed out, or the player had nothing for this page
      setObj(data);
      const pp = data.page && data.page.passwordProtection;
      if (!pp || !pp.enabled) { setShow(true); }
      else { useModal.getState().open('password', { message: pp.message || '', pluginName, resolve: (ok: boolean) => { if (ok) { setShow(true); } else { nav('/playback'); } } }); }
    };
    // the answer to this page's ask, and afterwards the player's own pushes (after a save) for it
    const off = onUiConfig((page, cfg) => { if (page === null || page === pageKey(pluginName)) { take(cfg); } });
    // the route names the page with a dash; the player wants category/name
    takeRef.current = take;
    askUiConfig(pageKey(pluginName), wizard).then(take);
    return () => { alive = false; off(); useSettings.setState({ route: { name: '', pluginName: '' } }); };
  }, [pluginName, wizard]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSection = async (section: any) => {
    if (!section.onSave) { return; }   // nothing to call: never an empty callMethod
    const saveObj = { ...section.onSave };
    if (section.saveButton && section.saveButton.data) {
      const data: Record<string, any> = {};
      section.saveButton.data.forEach((id: string) => { const item = (section.content || []).find((it: any) => it.id === id); if (item) { data[id] = item.element === 'equalizer' ? (item.config.bars || []).map((b: any) => b.value) : item.value; } });
      saveObj.data = data;
    }
    if (saveObj.askForConfirm) { const c = saveObj.askForConfirm; if (!(await useModal.getState().confirm(c))) { return; } delete saveObj.askForConfirm; }
    emit('callMethod', saveObj);
  };
  const saveButton = async (item: any) => {
    if (!item.onClick) { return; }   // a button that says nothing does nothing: never an empty callMethod
    const c = item.onClick;
    const run = () => {
      if (c.type === 'emit') { emit(c.message, c.data); }
      else if (c.type === 'openUrl') { window.open(c.url); }
      else if (c.type === 'oauth') { const redirect = new URL('/api/v1/oauth', HOST || window.location.origin); /* HOST is '' on the player: a bare path is not a URL */ redirect.searchParams.set('plugin', c.plugin); redirect.searchParams.set('plugin_url', String(window.location)); const u = new URL(c.performerUrl); u.searchParams.set('redirect_uri', redirect.href); (c.scopes || []).forEach((s: string) => u.searchParams.append('scope', s)); window.location.href = u.href; }
      else if (c.type === 'goto') { nav('/static-page/' + encodeURIComponent(c.pageName)); }
      else if (c.type === 'myVolumioUpgrade') { nav('/myvolumio/plans'); }
      else { emit('callMethod', c); }
    };
    if (c.askForConfirm) { if (!(await useModal.getState().confirm({ ...c.askForConfirm, danger: item.id === 'factory' }))) { return; } if (c.type === 'emit') { emit(c.message, c.data); } else { emit('callMethod', c); } return; }
    run();
  };
  const isAppearance = pluginName === 'miscellanea-appearance';
  // nothing yet: say so, instead of a blank screen — the settings may take a moment on a slow player, and a
  // plugin that fails to build them would otherwise leave the page black for good
  if (!show || !obj) {
    return (
      <div className="container-fluid"><div className="row"><div className="col-xs-24" id="pluginWrapper">
        <PageHead variant="settings" back={() => nav('/settings')} backLabel="Settings" nav={<Crumbs root="Settings" current="" onHome={() => nav('/settings')} />} />
        <div className="aw-pluginwait">
          {answered ? (
            <>
              <Icon name="error" />
              <p className="aw-pluginwait__text">This plugin did not send its settings page. It may still be starting, or it failed to build the page.</p>
              <button type="button" className="aw-btn aw-btn--primary" onClick={() => { setAnswered(false); askUiConfig(pageKey(pluginName), wizard).then(takeRef.current); }}><span>Try again</span></button>
            </>
          ) : (<><Spinner size={24} /><p className="aw-pluginwait__text">Loading settings…</p></>)}
        </div>
      </div></div></div>
    );
  }
  const page = obj.page || {};
  const showDoc = !!(ui.pluginsDoc && ui.pluginsDoc.showDoc);
  const showDesc = !(ui.pluginsDoc && ui.pluginsDoc.showDescription === false);   // shown unless the player's interface settings say otherwise
  return (
    <div className="container-fluid"><div className="row"><div className="col-xs-24" id="pluginWrapper">
      <PageHead variant="settings" back={() => nav('/settings')} backLabel="Settings" nav={<Crumbs root="Settings" current={page.label || ''} onHome={() => nav('/settings')} />} />
      <div className="box">
        <div className="boxHeader"><div className="title">
          <h2><a className="btn btn-primary" onClick={() => nav('/settings')}><i className="fa fa-arrow-left"><Icon name="arrow_back" /></i></a>{' ' + (page.label || '')}</h2>
          {params.get('isPluginSettings') ? <button type="button" className="btn btn-link btn-xs" onClick={() => window.history.back()}><Icon name="chevron_left" /> <span>Back</span></button> : null}
        </div></div>
        {page.description ? <h4 className="pluginDescription">{page.description}</h4> : null}
        {(obj.sections || []).filter((s: any) => !s.hidden).map((section: any, si: number) => {
          const Core = section.coreSection ? CORE[section.coreSection] : null;
          return (
            <div className="panel panel-default" key={si} data-section-id={section.id}>
              {Core ? <div><Core /></div> : null}
              {!section.coreSection ? (
                <div className="panel-heading"><h3 className="panel-title">
                  {section.icon ? <i className={'fa ' + section.icon} /> : null}
                  {!section.icon && section.image ? <img src={HOST + '/albumart?sectionimage=' + section.image} className="section-image" alt="" /> : null} {section.label}
                </h3></div>
              ) : null}
              {!section.coreSection ? (
                <div className="panel-body">
                  {section.description ? <h4 className="sectionDescription">{section.description}</h4> : null}
                  {section.content ? (
                    <div><form onSubmit={(e) => e.preventDefault()}>
                      {(section.content || []).map((item: any, ii: number) => visible(item, section) ? (
                        <div className="form-group" key={item.id || ii}>
                          <label htmlFor={item.id} className="plugin-label control-label">{item.label}</label>
                          {item.element !== 'equalizer' ? (
                            <div className="control-item"><div>
                              {item.element === 'input' ? <input id={item.id} type={item.type} className="form-control" value={item.value ?? ''} onChange={(e) => { item.value = item.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value; rerender(); }} {...inputAttrs(item.attributes)} /> : null}
                              {item.element === 'switch' ? <Switch on={item.value === true || item.value === 'true'} onChange={(v) => { item.value = v; rerender(); }} label={item.label} /> : null}
                              {item.element === 'select' ? (
                                // two or three choices as a segment, but only for a value one of them carries: a segment
                                // cannot show anything else, the select shows the value's own label (as Volumio does)
                                item.options && item.options.length > 1 && item.options.length <= 3 && item.options.some((o: any) => same(item.value, o) || (item.value && typeof item.value === 'object' && o && typeof o === 'object' && o.label === item.value.label))
                                  ? <Segment value={item.value} options={item.options} onChange={(o) => { item.value = o; rerender(); }} label={item.label} />
                                  : <Select value={item.value} options={item.options || []} onChange={(o) => { item.value = o; rerender(); }} label={item.label} placeholder="Enter an address..." byLabel={item.id === 'i2sid'} />
                              ) : null}
                              {item.element === 'button' ? <button id={item.id} type="button" className="btn btn-info" name={item.id} plugin-attributes="" onClick={() => saveButton(item)}>{item.button_label !== undefined ? item.button_label : item.label}</button> : null}
                            </div></div>
                          ) : (
                            <div className="equalizer-plugin"><div><div className="equalizer-bars">
                              {((item.config && item.config.bars) || []).map((bar: any, bi: number) => (
                                <div className={'equalizer ' + ((item.config && item.config.orientation) || 'vertical')} key={bi}>
                                  <label className="equalizer-label">{bar.ticksLabels && bar.ticksLabels[0]}</label>
                                  <input type="range" min={bar.min} max={bar.max} step={bar.step} value={bar.value} onChange={(e) => { bar.value = Number(e.target.value); rerender(); }} aria-label={bar.ticksLabels && bar.ticksLabels[0]} />
                                </div>
                              ))}
                            </div></div></div>
                          )}
                          {showDoc && item.doc ? <div className="control-doc"><a onClick={() => useModal.getState().open('gotit', { message: item.doc })}><i className="fa fa-info-circle"><Icon name="info" /></i></a></div> : null}
                          {showDesc && item.description ? <div className="control-description">{item.description}</div> : null}
                          <div style={{ clear: 'both' }} />
                        </div>
                      ) : null)}
                      {section.saveButton && !section.saveButton.hidden ? <div className="form-group"><div className="control-buttons"><button type="button" className="btn btn-info" onClick={() => saveSection(section)}>{section.saveButton.label}</button></div></div> : null}
                    </form></div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {isAppearance ? <AppearanceSlot /> : null}
    </div></div></div>
  );
}
