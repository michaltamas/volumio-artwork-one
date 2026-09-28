/** The Plugins page: search (categories, cards) and installed (rows), with the installer modal. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import { pluginIcon } from '../core/pluginIcons';
import { on, emit } from '../core/socket';
import { useSettings } from '../core/store/settings';
import { useModal } from '../core/store/modal';
import { Switch } from '../components/settings/controls';

export default function PluginManager() {
  const nav = useNavigate();
  const [tab, setTab] = useState(0);
  const [installed, setInstalled] = useState<any[]>([]);
  const [available, setAvailable] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  useEffect(() => {
    useSettings.setState({ route: { name: 'volumio.plugin-manager', pluginName: '' } });
    const offs = [
      on('pushInstalledPlugins', (d: any) => setInstalled(Array.isArray(d) ? d : [])),
      on('pushAvailablePlugins', (d: any) => { setAvailable(d); setCategory(d && d.categories && d.categories[0]); }),
      on('openInstallerModal', () => useModal.getState().open('installer', null)),
    ];
    emit('getInstalledPlugins'); emit('getAvailablePlugins');
    return () => { offs.forEach(f => f()); useSettings.setState({ route: { name: '', pluginName: '' } }); };
  }, []);
  const uninstall = (pl: any) => { emit('preUninstallPlugin', { name: pl.name, category: pl.category }); const off = on('installPluginStatus', (d: any) => { off(); useModal.getState().open('installer', d); }); };
  return (
    <div className="box">
      <PageHead variant="settings" back={() => nav('/settings')} backLabel="Settings" nav={<Crumbs root="Settings" current="Plugins" onHome={() => nav('/settings')} />} />
      <div className="boxHeader"><div className="title"><h2><a className="btn btn-primary" onClick={() => window.history.back()}><i className="fa fa-arrow-left"><Icon name="arrow_back" /></i></a> <span>Plugins</span></h2></div></div>
      <div id="pluginsPlugin" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><i className="fa fa-plug" /> <span>Plugins Management</span></h3></div>
        <div className="panel-body">
          <ul className="nav nav-tabs">
            <li className={tab === 0 ? 'active' : ''}><a onClick={() => setTab(0)}>Search Plugins</a></li>
            <li className={tab === 1 ? 'active' : ''}><a onClick={() => setTab(1)}>Installed Plugins</a></li>
          </ul>
          {tab === 0 ? (
            <div className="row">
              <div className="col-sm-4">
                {((available && available.categories) || []).map((c: any, i: number) => <div key={i}><button type="button" className={'btn btn-link pluginCategoryBtn' + (category && c.name === category.name ? ' active' : '')} onClick={() => setCategory(c)}>{c.prettyName}</button></div>)}
                <div className="clearfix" />
              </div>
              <div className="col-sm-20">
                {((category && category.plugins) || []).map((pl: any, i: number) => (
                  <div className="panel panel-default" key={i}>
                    <div className="panel-heading"><h3 className="panel-title"><i className={'fa ' + (pl.icon || 'fa-cube')}><Icon name={pluginIcon(pl.icon || 'fa-cube')} /></i>{pl.prettyName}</h3></div>
                    <div className="panel-body">
                      <div>{pl.description}</div><br />
                      <div className="row pluginDetailsRow"><div className="col-xs-12"><strong>Author: </strong>{pl.author}</div><div className="col-xs-12 text-right"><strong>Updated: </strong>{pl.updated}</div></div>
                      <div className="row pluginDetailsRow"><div className="col-xs-12"><strong>Version: </strong>{pl.version}</div></div><br />
                      <div>
                        {!pl.installed ? <button type="button" className="btn btn-info pull-right marginLeft" onClick={() => emit('installPlugin', { url: pl.url, name: pl.name, category: category.name })} title="Install"><span>Install</span></button> : null}
                        {pl.updateAvailable ? <button type="button" className="btn btn-info pull-right marginLeft" onClick={() => emit('updatePlugin', { url: pl.url, name: pl.name, prettyName: pl.prettyName, category: category.name })} title="Update"><span>Update</span></button> : null}
                        {pl.installed ? <button type="button" className="btn btn-danger pull-right marginLeft" onClick={() => uninstall({ ...pl, category: category.name })} title="Uninstall"><span>Uninstall</span></button> : null}
                        <button type="button" className="btn btn-info pull-right" onClick={() => emit('getPluginDetails', { name: pl.name, category: category.name })} title="Details"><span>Details</span></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {installed.map((pl, i) => (
                <div id="installed-plugin-lists" key={i}>
                  <div className="row">
                    <div className="col-xs-24 col-sm-24 col-md-14" id="list-group"><div className="row">
                      <div className="col-xs-8 col-sm-8 col-md-8"><i className={'fa ' + (pl.icon || 'fa-cube') + ' fa-lg'}><Icon name={pluginIcon(pl.icon || 'fa-cube')} /></i>{' ' + pl.prettyName + ' '}{pl.version ? <small className="text-muted">{pl.version}</small> : null}</div>
                      <div className="col-xs-8 col-sm-8 col-md-8"><Switch on={pl.enabled === true || pl.enabled === 'true'} onChange={() => emit('pluginManager', { name: pl.name, category: pl.category, action: pl.active ? 'disable' : 'enable' })} label={pl.prettyName} /></div>
                      <div className="col-xs-8 col-sm-8 col-md-8"><span className={'pluginDotStatus' + (pl.active ? ' active' : ' inactive')} />{' '}<span>{pl.active ? 'Active' : 'Inactive'}</span></div>
                    </div></div>
                    <div className="col-xs-24 col-sm-24 col-md-8"><div className="row">
                      <div className="col-xs-8 col-sm-8 col-md-8">{pl.updateAvailable ? <button type="button" className="btn btn-info pull-right" onClick={() => emit('updatePlugin', { url: pl.url, name: pl.name, prettyName: pl.prettyName, category: pl.category })} title="Update"><Icon name="refresh" /> Update</button> : null}</div>
                      <div className="col-xs-8 col-sm-8 col-md-8">{pl.enabled ? <button type="button" className="btn btn-info pull-right" onClick={() => nav('/plugin/' + pl.category + '-' + pl.name + '?isPluginSettings=1')} title="Settings">Settings</button> : null}</div>
                      <div className="col-xs-8 col-sm-8 col-md-8"><button type="button" className="btn btn-danger pull-right" onClick={() => uninstall(pl)} title="Uninstall">Uninstall</button></div>
                    </div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
