/** A settings page generated from a plugin's UI config: sections of rows (input, switch, select, button), core sections, the save button. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import { emit, HOST } from '../core/socket';
import { askUiConfig, onUiConfig, pageKey } from '../core/uiConfig';
import { useSettings } from '../core/store/settings';
import { useUiSettings } from '../core/store/uiSettings';
import { useModal } from '../core/store/modal';
import { Switch, Select, Segment } from '../components/settings/controls';
import { CORE } from '../components/settings/CoreSections';
import AppearanceSlot from '../components/settings/AppearanceSlot';

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
  const [, bump] = useState(0);
  const rerender = () => bump(n => n + 1);
  useEffect(() => {
    useSettings.setState({ route: { name: 'volumio.plugin', pluginName } });
    setObj(null); setShow(false);
    let alive = true;
    const take = (data: any) => {
      if (!alive || !data) { return; }
      setObj(data);
      const pp = data.page && data.page.passwordProtection;
      if (!pp || !pp.enabled) { setShow(true); }
      else { useModal.getState().open('password', { message: pp.message || '', pluginName, resolve: (ok: boolean) => { if (ok) { setShow(true); } else { nav('/playback'); } } }); }
    };
    // the answer to this page's ask, and afterwards the player's own pushes (after a save) for it
    const off = onUiConfig((page, cfg) => { if (page === null || page === pageKey(pluginName)) { take(cfg); } });
    // the route names the page with a dash; the player wants category/name
    askUiConfig(pageKey(pluginName), wizard).then(take);
    return () => { alive = false; off(); useSettings.setState({ route: { name: '', pluginName: '' } }); };
  }, [pluginName, wizard]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSection = async (section: any) => {
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
    const c = item.onClick || {};
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
  if (!show || !obj) { return <div className="container-fluid" />; }
  const page = obj.page || {};
  const showDoc = !!(ui.pluginsDoc && ui.pluginsDoc.showDoc);
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
                              {item.element === 'input' ? <input id={item.id} type={item.type} className="form-control" value={item.value ?? ''} onChange={(e) => { item.value = item.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value; rerender(); }} {...Object.assign({}, ...((item.attributes || []).map((a: any) => a)))} /> : null}
                              {item.element === 'switch' ? <Switch on={item.value === true || item.value === 'true'} onChange={(v) => { item.value = v; rerender(); }} label={item.label} /> : null}
                              {item.element === 'select' ? (
                                item.options && item.options.length > 1 && item.options.length <= 3
                                  ? <Segment value={item.value} options={item.options} onChange={(o) => { item.value = o; rerender(); }} label={item.label} />
                                  : <Select value={item.value} options={item.options || []} onChange={(o) => { item.value = o; rerender(); }} label={item.label} placeholder="Enter an address..." />
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
                          {item.description ? <div className="control-description">{item.description}</div> : null}
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
