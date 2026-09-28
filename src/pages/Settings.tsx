/** The settings landing: the title, the search, the hint; the section list lives in the shell's nav. */
import SettingsSearch from '../components/settings/SettingsSearch';
import { useUiSettings } from '../core/store/uiSettings';
import { usePlayer } from '../core/store/player';
import { emit } from '../core/socket';

export default function Settings() {
  const ui = useUiSettings(s => s.settings);
  const service = usePlayer(s => s.state.service);
  const boxes = (ui.settings && ui.settings.checkboxes) || {};
  return (
    <div className="setting-container panel panel-default">
      <div className="panel-heading"><h2 className="panel-title"><i className="fa fa-cog" /><span>Settings</span></h2></div>
      <div className="panel-body">
        <div className="row"><div className="col-xs-24">
          <SettingsSearch />
          <p className="aw-settings-hint mono">CHOOSE A SECTION</p>
          {boxes.analogInput ? <div className="hardwareToggleCheckbox"><input type="checkbox" checked={service === 'analogin'} onChange={() => emit('callMethod', { endpoint: 'system_controller/gpios', method: 'DASwitchPress' })} /><span>Analog input</span></div> : null}
          {boxes.bluetooth ? <div className="hardwareToggleCheckbox"><input type="checkbox" checked={service === 'bluetoth'} onChange={() => emit('callMethod', { endpoint: 'audio_interface/bluetooth', method: 'BTpress' })} /><span>Bluetooth</span></div> : null}
        </div></div>
      </div>
    </div>
  );
}
