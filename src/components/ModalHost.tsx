/**
 * The modal frame the theme's sheets sit in: a blurred scrim, a centred window of the sheet's
 * width. Escape and a tap on the scrim close it.
 */
import { useEffect } from 'react';
import { useModal } from '../core/store/modal';
import PowerSheet from './sheets/PowerSheet';
import PlaylistSheet from './sheets/PlaylistSheet';
import WebRadioSheet from './sheets/WebRadioSheet';
import SleepSheet from './sheets/SleepSheet';
import AlarmSheet from './sheets/AlarmSheet';
import TrackActionsSheet from './sheets/TrackActionsSheet';
import CreditsSheet from './sheets/CreditsSheet';
import { TermsSheet, PayingSheet } from './sheets/MyVolumioSheets';
import { ConfirmSheet, GotItSheet, PasswordSheet, InstallerSheet, UpdaterSheet, NasPasswordSheet, GenericModalSheet } from './sheets/SmallSheets';

const WIDTH: Record<string, number> = { 'power-off': 440, 'alarm-clock': 760, playlist: 480, 'track-actions': 460, 'web-radio': 480, sleep: 460, credits: 560, confirm: 560, gotit: 660, password: 460, installer: 660, updater: 660, 'nas-password': 560, 'myv-terms': 760, 'myv-paying': 560, generic: 560 };

export default function ModalHost() {
  const name = useModal(s => s.name);
  const data = useModal(s => s.data);
  useEffect(() => {
    if (!name) { return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { useModal.getState().close(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [name]);
  if (!name) { return null; }
  let sheet: React.ReactNode = null;
  if (name === 'power-off') { sheet = <PowerSheet />; }
  if (name === 'playlist') { sheet = <PlaylistSheet />; }
  if (name === 'web-radio') { sheet = <WebRadioSheet />; }
  if (name === 'sleep') { sheet = <SleepSheet />; }
  if (name === 'alarm-clock') { sheet = <AlarmSheet />; }
  if (name === 'track-actions') { sheet = <TrackActionsSheet />; }
  if (name === 'credits') { sheet = <CreditsSheet />; }
  if (name === 'confirm') { sheet = <ConfirmSheet />; }
  if (name === 'gotit') { sheet = <GotItSheet />; }
  if (name === 'password') { sheet = <PasswordSheet />; }
  if (name === 'installer') { sheet = <InstallerSheet />; }
  if (name === 'updater') { sheet = <UpdaterSheet />; }
  if (name === 'nas-password') { sheet = <NasPasswordSheet />; }
  if (name === 'myv-terms') { sheet = <TermsSheet />; }
  if (name === 'myv-paying') { sheet = <PayingSheet />; }
  if (name === 'generic') { sheet = <GenericModalSheet />; }
  const width = name === 'generic' && data && data.size === 'lg' ? 760 : (WIDTH[name] || 560);
  return (
    <>
      <div className="modal-backdrop in" onClick={() => useModal.getState().close()} />
      <div className={'modal aw-dlg--' + name} role="dialog" onClick={(e) => { if (e.target === e.currentTarget) { useModal.getState().close(); } }}>
        <div className="modal-dialog" style={{ width }}>
          <div className="modal-content">{sheet}</div>
        </div>
      </div>
    </>
  );
}
