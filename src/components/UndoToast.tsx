/** The undo toast (handoff 7b): bottom centre above the mini player, one at a time. */
import { useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useUndo } from '../core/store/undo';

export default function UndoToast() {
  const cur = useUndo(s => s.current);
  const loc = useLocation();
  if (!cur) { return null; }
  return (
    <div className={'aw-undo' + (loc.pathname === '/playback' ? ' aw-undo--np' : '')} role="status" key={cur.key}>
      <Icon name={cur.icon} className="aw-undo__icon" />
      <div className="aw-undo__text">
        <div className="aw-undo__eyebrow mono">{cur.eyebrow}</div>
        <div className="aw-undo__title">{cur.title}</div>
      </div>
      {cur.undo ? <button type="button" className="aw-undo__btn" onClick={() => useUndo.getState().undo()}>Undo</button> : null}
    </div>
  );
}
