/** The right-hand cluster's two pills (handoff 16D), the same in Now Playing and the mini player: where the music plays, and the queue with its length. */
import Icon from './Icon';
import { useQueue } from '../core/store/queue';
import { useMultiroom } from '../core/store/multiroom';
import { useUi } from '../core/store/ui';

export function OutputPill() {
  const zone = useMultiroom(s => s.zones.find(z => z.isSelf)?.name || '');
  const open = useUi(s => s.outputsOpen);
  return (
    <button type="button" className={'tb-pill tb-pill--output' + (open ? ' active' : '')} onClick={() => useUi.getState().toggleOutputs()} title="Zones & outputs">
      <Icon name="speaker" /><span className="tb-pill__name">{zone || 'This player'}</span>
    </button>
  );
}

export function QueuePill({ active, onClick }: { active?: boolean; onClick?: () => void }) {
  const len = useQueue(s => s.queue.length);
  const open = useUi(s => s.queueOpen);
  return (
    <button type="button" className={'tb-pill tb-pill--queue' + ((active ?? open) ? ' active' : '')} onClick={onClick || (() => useUi.getState().toggleQueue())} title="Queue">
      <Icon name="queue_music" />{len ? <span className="tb-pill__count mono">{len}</span> : null}
    </button>
  );
}
