/** Credits / story details (Volumio's own modal in the theme's dress): a title, a story, or a credits table. */
import { useModal } from '../../core/store/modal';

export default function CreditsSheet() {
  const data = useModal(s => s.data) || {};
  const close = () => useModal.getState().close();
  const credits: { key: string; values: { name: string; uri?: string }[] }[] = Array.isArray(data.credits) ? data.credits : [];
  return (
    <div id="modalPlaylist">
      <div className="modal-header"><h3 className="modal-title">{data.title}</h3></div>
      {data.story ? <div className="modal-body darker-bg credits-story" dangerouslySetInnerHTML={{ __html: String(data.story) }} /> : null}
      {credits.length ? (
        <div className="modal-body darker-bg">
          <table className="table"><tbody>
            {credits.map((row, i) => (
              <tr key={i} className="album-credits-row">
                <td className="album-credits-title">{row.key}</td>
                <td className="album-credits-title">{(row.values || []).map((c, j) => <p key={j} className="album-credits-row">{c.name}</p>)}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      ) : null}
      <div className="modal-footer">
        <button type="button" className="btn btn-warning" onClick={close}>Close</button>
        {data.upgradeCta ? <button type="button" className="btn btn-primary" onClick={() => { window.open('https://myvolumio.org', '_blank'); close(); }}>Upgrade to Premium</button> : null}
      </div>
    </div>
  );
}
