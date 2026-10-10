/** A static page of the theme (help, about…): its HTML as the player serves it. */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { HOST } from '../core/socket';
import PageHead from '../components/PageHead';
import Crumbs from '../components/browse/Crumbs';
import Spinner from '../components/Spinner';

// A page a settings button opens (Settings → System → Credits and Open Source licenses): Volumio's own
// static page, shipped with the interface, shown in the settings frame like a plugin's page.
export function StaticPage() {
  const { pageName = '' } = useParams();
  const nav = useNavigate();
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => { setHtml(null); fetch(HOST + '/app/themes/artwork/assets/static-pages/' + encodeURIComponent(pageName) + '.html').then(r => r.ok ? r.text() : '').then(setHtml).catch(() => setHtml('')); }, [pageName]);
  const title = pageName ? pageName.charAt(0).toUpperCase() + pageName.slice(1) : '';
  const back = () => { if (window.history.length > 1) { window.history.back(); } else { nav('/settings'); } };
  return (
    <div className="container-fluid aw-static-page"><div className="row"><div className="col-xs-24" id="pluginWrapper">
      <PageHead variant="settings" back={back} backLabel="Settings" nav={<Crumbs root="Settings" current={title} onHome={() => nav('/settings')} />} />
      {html === null ? <div className="aw-pluginwait"><Spinner size={24} /></div>
        : html ? <div dangerouslySetInnerHTML={{ __html: html }} />
        : <div className="aw-pluginwait"><p className="aw-pluginwait__text">This page is not available.</p></div>}
    </div></div></div>
  );
}

export function IframePage() {
  const { url: fromPath = '' } = useParams();   // the frame's route carries the address as its parameter
  const [params] = useSearchParams();
  const nav = useNavigate();
  const url = (fromPath ? fromPath.replace(/~2F/g, '/').replace(/~~/g, '~') : '') || params.get('url') || '';   // the frame's `~2F` slashes
  return (
    <>
      <div className="iframe-page-title" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: 5 }}><h2 style={{ margin: 10 }}><a className="btn btn-primary" onClick={() => nav('/playback')}><i className="fa fa-arrow-left" style={{ fontSize: 24 }}><Icon name="arrow_back" /></i></a></h2></div>
      <iframe src={url} width="100%" height="100%" title="page" />
    </>
  );
}
