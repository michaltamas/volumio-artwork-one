/** MyVolumio's modals: the terms (fetched from Volumio's TOS page, else the bundled copy) and the "paying" wait. */
import { useEffect, useState } from 'react';
import { useModal } from '../../core/store/modal';

export function TermsSheet() {
  const data = useModal(s => s.data) || {};
  const [html, setHtml] = useState('');
  useEffect(() => {
    let alive = true;
    fetch('https://volumio.github.io/volumio-tos/', { method: 'GET', cache: 'default' }).then(r => r.text())
      .catch(() => fetch('/myvolumio-tos.html').then(r => r.text()))
      .then(body => { if (alive) { setHtml(body); } }).catch(() => { /* nothing to show */ });
    return () => { alive = false; };
  }, []);
  return (
    <div id="myvolumio-terms-modal">
      <div className="modal-header"><h3 className="modal-title">{data.title}</h3></div>
      <div className="modal-body" id="tosContainer" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="modal-footer"><button className="btn btn-warning" onClick={() => useModal.getState().close()}>Close</button></div>
    </div>
  );
}

export function PayingSheet() {
  const data = useModal(s => s.data) || {};
  return (
    <div id="myvolumio-paying-modal">
      <div className="modal-header"><h3 className="modal-title">{data.title}</h3></div>
      <div className="modal-body"><h4>Paying…</h4><p>Please wait meanwhile the transaction occurs.</p></div>
      <div className="modal-footer"></div>
    </div>
  );
}
