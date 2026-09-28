/** The Power dialog (Dialogs mockup): the two real actions as rows, Cancel below. */
import Icon from '../Icon';
import { emit } from '../../core/socket';
import { useModal } from '../../core/store/modal';

export default function PowerSheet() {
  const data = useModal(s => s.data) || {};
  const close = () => useModal.getState().close();
  return (
    <div className="aw-sheet aw-sheet--power">
      <div className="aw-confirm__head">
        <div className="aw-confirm__tile"><Icon name="power_settings_new" /></div>
        <div className="aw-confirm__title">{data.name || 'Shutdown'}</div>
      </div>
      <div className="aw-power__actions">
        <button type="button" id="powerOffBtn" className="aw-power__row aw-power__row--primary" onClick={() => { emit('shutdown'); close(); }}>
          <Icon name="power_settings_new" /><span className="aw-power__label">Power off</span>
        </button>
        <button type="button" id="rebootBtn" className="aw-power__row" onClick={() => { emit('reboot'); close(); }}>
          <Icon name="restart_alt" /><span className="aw-power__label">Reboot</span>
        </button>
        <button type="button" className="aw-power__cancel" onClick={close}><span>Cancel</span></button>
      </div>
    </div>
  );
}
