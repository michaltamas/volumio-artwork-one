import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useAuth } from './core/store/auth';
import './styles/global.scss';
import './styles/rail.scss';
import './styles/controls.scss';
import './styles/mini.scss';
import './styles/np.scss';
import './styles/head.scss';
import './styles/home.scss';
import './styles/browse.scss';
import './styles/toasts.scss';
import './styles/zones.scss';
import './styles/settings.scss';
import './styles/plugin.scss';
import './styles/myvolumio.scss';
import './styles/queue.scss';
import './styles/queue-page.scss';
import './styles/wizard.scss';
import './styles/outputs.scss';
import './styles/menu.scss';
import './styles/modal.scss';
import './styles/sheets.scss';
import './styles/ambient.scss';
import './styles/phone.scss';
import './core/store/theme';
import './core/store/companion';
import { useBrowse } from './core/store/browse';
import { usePlayer } from './core/store/player';
import { useUi } from './core/store/ui';
import { useLyrics } from './core/store/lyrics';
import { useModal } from './core/store/modal';
import { useSettings } from './core/store/settings';
import { useUiSettings } from './core/store/uiSettings';
import './core/store/sleep';
import './core/store/screenOn';
import './core/store/screenPrefs';
import './core/tooltips';
import './core/marquee';
import { useAmbient } from './core/store/ambient';
import './core/store/settings';
import './core/store/uiSettings';
import { useLocalPlayback, audioStatus, audioMuted } from './core/localPlayback';
import { useConnection } from './core/store/connection';
import socket from './core/socket';

// the stores, for the headless checks that drive both builds through the same pages
(window as any).aw = { browse: useBrowse, player: usePlayer, ui: useUi, lyrics: useLyrics, modal: useModal, settings: useSettings, uiSettings: useUiSettings, ambient: useAmbient, auth: useAuth, localPlayback: useLocalPlayback, localAudio: audioStatus, localMuted: audioMuted, connection: useConnection, socket };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
