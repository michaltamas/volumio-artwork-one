/** A settings page generated from a plugin's UI config (handoff 15): the page's head, then a card per section — rows of input, switch, select, button, equalizer — and Volumio's own core sections. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import { emit, HOST } from '../core/socket';
import { askUiConfig, onUiConfig, pageKey } from '../core/uiConfig';
import { useSettings } from '../core/store/settings';
import { useMenu } from '../core/store/menu';
import { usePlugins } from '../core/store/plugins';
import { useModal } from '../core/store/modal';
import { Switch } from '../components/settings/controls';
import SettingsCard, { type CardView, type RowView } from '../components/settings/SettingsCard';
import { pageCopy, sectionLabel, itemCopy } from '../core/settingsCopy';
import { pluginIcon } from '../core/pluginIcons';
import { plainText } from '../core/plainText';
import { buildDay } from '../core/format';
import { CORE } from '../components/settings/CoreSections';
import AppearanceSlot from '../components/settings/AppearanceSlot';
import Spinner from '../components/Spinner';

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

// what a section's save would send, as text: the card is changed while this differs from what the player sent
const valuesOf = (section: any) => JSON.stringify((section.content || []).map((c: any) => c.element === 'equalizer' ? ((c.config && c.config.bars) || []).map((b: any) => b.value) : c.value));
const restore = (section: any, snap: string) => { const v = JSON.parse(snap); (section.content || []).forEach((c: any, i: number) => { if (c.element === 'equalizer') { ((c.config && c.config.bars) || []).forEach((b: any, bi: number) => { b.value = v[i][bi]; }); } else { c.value = v[i]; } }); };
const same = (a: any, b: any) => String(a ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase() === String(b ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
// the hint under a row: the plugin's description, else its documentation (as text: some send HTML) — not when it only repeats the label
function hintOf(item: any, label: string): string | undefined {
  const t = plainText(String(item.description || item.doc || '')).trim();
  return t && !same(t, label) && !same(t, item.label) ? t : undefined;
}

export default function PluginPage({ wizard }: { wizard?: boolean }) {
  const { pluginName = '' } = useParams();
  // a plugin's page without its own settings entry (FusionDsp, Spotify, …) sits under Plugins: its crumb and its back lead there
  const underPlugins = useSettings(st => !!pluginName && st.menu().length > 0 && !st.inMenu(pluginName));
  const parent = underPlugins ? { path: '/plugin-manager', label: 'Plugins', trail: [{ title: 'Plugins', uri: '/plugin-manager' } as any] } : { path: '/settings', label: 'Settings', trail: undefined };
  const nav = useNavigate();
  const [obj, setObj] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [answered, setAnswered] = useState(false);   // the ask came back empty
  const takeRef = useRef<(d: any) => void>(() => {});
  const snaps = useRef<Map<any, string>>(new Map());   // each section's values as the player sent them
  const plugin = usePlugins(st => st.installed.find((p: any) => p && pluginName === p.category + '-' + p.name) || null);
  const storeEntry = usePlugins(st => { const cats = (st.available && st.available.categories) || []; for (const c of cats) { const f = (c.plugins || []).find((p: any) => p && pluginName === (p.category || c.name) + '-' + p.name); if (f) { return f; } } return null; });
  const menuName = useSettings(st => { const it = st.menu().find(i => i && i.state === 'volumio.plugin' && String((i.params && i.params.pluginName) || '').replace('/', '-') === pluginName); return it ? String(it.name || '') : ''; });
  const systemInfo = useMenu(st => st.systemInfo);
  useEffect(() => { usePlugins.getState().ensure(); }, []);
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
      snaps.current = new Map((data.sections || []).map((sec: any) => [sec, valuesOf(sec)]));
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
    snaps.current.set(section, valuesOf(section)); rerender();   // saved: the card is clean until the next change
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
  const back = <PageHead variant="settings" back={() => nav(parent.path)} backLabel={parent.label} nav={<Crumbs root="Settings" trail={parent.trail} onCrumb={() => nav('/plugin-manager')} current={obj && show ? ((obj.page && obj.page.label) || '') : ''} onHome={() => nav('/settings')} />} actions={helpItem(obj) ? <button type="button" className="aw-sp-helpicon" onClick={() => saveButton(helpItem(obj))} aria-label="Help" title="Help"><Icon name="help" /></button> : undefined} />;
  // nothing yet: say so, instead of a blank screen — the settings may take a moment on a slow player, and a
  // plugin that fails to build them would otherwise leave the page black for good
  if (!show || !obj) {
    return (
      <div className="container-fluid"><div className="row"><div className="col-xs-24" id="pluginWrapper">
        {back}
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
  const copy = pageCopy(pluginName);
  const help = helpItem(obj);
  const sections: any[] = (obj.sections || []).filter((s: any) => !s.hidden && !(s.coreSection && (copy.dropCore || []).indexOf(s.coreSection) > -1));
  const order = copy.first || [];
  const rank = (s: any) => { const i = order.indexOf(s.id); return i < 0 ? order.length : i; };
  sections.sort((a, b) => rank(a) - rank(b));   // stable: the rest keep the player's order
  const moved: { card: CardView; section: any }[] = [];
  const cards: { card: CardView; section: any }[] = [];
  sections.forEach((section: any, si: number) => {
    const key = (section.id || 'section') + '-' + si;
    if (section.coreSection) {
      const Core = CORE[section.coreSection];
      const head = CORE_CARDS[section.coreSection];
      if (Core) { cards.push({ section, card: { key, id: section.id, label: head ? head.label : '', icon: head ? head.icon : 'settings', bare: !head, rows: [], core: <Core />, action: section.coreSection === 'network-drives' ? <button type="button" className="aw-sc__action" onClick={() => emit('showNasHelper')} aria-label="About network drives" title="About network drives"><Icon name="info" /></button> : undefined } }); }
      return;
    }
    const sc = (copy.sections || {})[section.id];
    const rows: RowView[] = [];
    (section.content || []).forEach((item: any) => {
      if (!visible(item, section) || item === help) { return; }
      const ic = itemCopy(sc && sc.items ? sc.items[item.id] : undefined, String(item.label ?? ''));
      const btn = item.button_label !== undefined && !same(item.button_label, item.label) ? String(item.button_label) : undefined;
      const row: RowView = { item, label: ic.label, hint: ic.hint || hintOf(item, ic.label), button: ic.button || btn };
      if (pluginName === 'system_controller-system' && item.id === 'update' && systemInfo && systemInfo.systemversion) { row.hint = 'INSTALLED ' + systemInfo.systemversion + (systemInfo.builddate ? ' · ' + buildDay(systemInfo.builddate) : ''); row.hintMono = true; }
      const own = (copy.ownCard || {})[item.id];
      if (own) { moved.push({ section, card: { key: own.id, id: own.id, label: own.label, icon: own.icon, danger: own.danger, rows: [row] } }); return; }
      rows.push(row);
    });
    // a card saves when it has something to save: a section of buttons only acts at once, and has no footer
    const saves = !!(section.saveButton && !section.saveButton.hidden && section.onSave) && rows.some(r => r.item.element !== 'button');
    if (!rows.length && !section.description) { return; }
    cards.push({ section, card: { key, id: section.id, label: sectionLabel(sc, String(section.label || '')), icon: (sc && sc.icon) || (section.icon ? pluginIcon(section.icon, 'settings') : 'settings'), description: section.description ? plainText(String(section.description)) : undefined, rows, save: saves ? String(section.saveButton.label || 'Save') : null } });
  });
  const all = cards.concat(moved);
  const isAppearance = pluginName === 'miscellanea-appearance';
  // the page's name: the settings menu's for Volumio's own pages, the plugin's own name for a plugin; the
  // page's longer title under it when it says more
  const title = menuName || (plugin && plugin.prettyName) || String(page.label || '');
  const subtitle = plugin && page.label && !same(page.label, title) ? String(page.label) : '';
  const author = storeEntry && storeEntry.author ? String(storeEntry.author) : '';
  const meta = plugin ? [plugin.version ? 'v' + plugin.version : '', author].filter(Boolean).join(' · ') : '';
  const enabled = !!plugin && (plugin.enabled === true || plugin.enabled === 'true');
  return (
    <div className="container-fluid"><div className="row"><div className="col-xs-24" id="pluginWrapper">
      {back}
      <div className="aw-sp">
        <header className="aw-sp-head">
          {underPlugins ? <button type="button" className="aw-sp-head__back" onClick={() => nav(parent.path)}><Icon name="chevron_left" /><span>{parent.label}</span></button> : null}
          <div className="aw-sp-head__row">
            <div className="aw-sp-head__text">
              <h2 className="aw-sp-head__title">{title}</h2>
              {subtitle || meta ? <div className="aw-sp-head__sub">{subtitle ? <span className="aw-sp-head__subtitle">{subtitle}</span> : null}{meta ? <span className="aw-sp-head__meta mono">{meta.toUpperCase()}</span> : null}</div> : null}
            </div>
            {help ? <button type="button" className="aw-sp-help" onClick={() => saveButton(help)}><Icon name="help" /><span>Help</span></button> : null}
            {plugin ? (
              <div className="aw-sp-enabled">
                <span className="aw-sp-enabled__label">Enabled</span>
                <Switch on={enabled} onChange={() => emit('pluginManager', { name: plugin.name, category: plugin.category, action: plugin.active ? 'disable' : 'enable' })} label={'Enabled: ' + title} noLabel />
              </div>
            ) : null}
          </div>
          {page.description ? <p className="aw-sp-head__desc">{plainText(String(page.description))}</p> : null}
        </header>
        <div className="aw-sp-cards">
          {all.map(({ card, section }) => {
            const snap = snaps.current.get(section);
            const was: any[] = snap ? JSON.parse(snap) : [];
            const now: any[] = JSON.parse(valuesOf(section));
            card.rows.forEach((r) => { const i = (section.content || []).indexOf(r.item); r.changed = i > -1 && JSON.stringify(was[i]) !== JSON.stringify(now[i]); });
            const dirty = !card.core && !!card.save && snaps.current.has(section) && snaps.current.get(section) !== valuesOf(section);
            return <SettingsCard key={card.key} card={card} dirty={dirty} onChange={rerender} onButton={saveButton} onSave={() => saveSection(section)} onCancel={() => { const v = snaps.current.get(section); if (v) { restore(section, v); rerender(); } }} />;
          })}
          {isAppearance ? <AppearanceSlot /> : null}
        </div>
      </div>
    </div></div></div>
  );
}

// Volumio's own sections drawn by the theme, as cards: the card's header in place of theirs. The network's two
// status tiles are cards themselves and go without a frame.
const CORE_CARDS: Record<string, { label: string; icon: string }> = {
  'system-version': { label: 'System version', icon: 'info' },
  'my-music': { label: 'My Music', icon: 'library_music' },
  'my-music-plugin-enabler': { label: 'Functionalities', icon: 'toggle_on' },
  'network-drives': { label: 'Network drives', icon: 'lan' },
  wifi: { label: 'Wireless networks', icon: 'wifi' },
  'ui-settings': { label: 'Theme settings', icon: 'brush' },
  'firmware-upload': { label: 'Update firmware via file', icon: 'upload' },
};

// a plugin's help (FusionDsp's "Help" button, a link out): the page header carries it, not a row
function helpItem(obj: any): any {
  for (const s of (obj && obj.sections) || []) {
    if (s.hidden) { continue; }
    const f = (s.content || []).find((c: any) => c && c.id === 'help' && c.element === 'button' && c.onClick && c.onClick.type === 'openUrl' && !c.hidden);
    if (f) { return f; }
  }
  return null;
}
