/** A static page of the theme (help, about…): its HTML as the player serves it. */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { HOST } from '../core/socket';

export function StaticPage() {
  const { pageName = '' } = useParams();
  const [html, setHtml] = useState('');
  useEffect(() => { fetch(HOST + '/app/themes/artwork/assets/static-pages/' + encodeURIComponent(pageName) + '.html').then(r => r.ok ? r.text() : '').then(setHtml).catch(() => setHtml('')); }, [pageName]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
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
