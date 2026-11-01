/** The queue page (/queue, the frame's volumio.queue state): the queue panel laid out as a page under the shared fixed head. */
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import QueuePanel from '../components/QueuePanel';

export default function QueuePage() {
  return (
    <div id="aw-queue-page" className="aw-qpage">
      <PageHead variant="list" nav={<Crumbs root="Queue" />} />
      <QueuePanel page />
    </div>
  );
}
