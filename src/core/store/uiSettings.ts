/** Volumio's UI settings (`pushUiSettings`): the track manager's button bar, the page title and the like. */
import { create } from 'zustand';
import { on, emit, HOST } from '../socket';

interface UiSettingsStore { settings: Record<string, any>; backgrounds: { list: any[] } | null }
// the theme's variant settings (artwork-settings.json), the defaults the player's push merges into
const DEFAULTS: Record<string, any> = { app: 'Volumio', pageTitle: 'Volumio - Artwork One', sideMenu: { checkboxes: { analogInput: false, bluetooth: false } }, pluginsDoc: { showDoc: true, showDescription: true }, addressBarColor: '#0a0c0e', knobThicknessDesktop: 0.2, knobThicknessMobile: 0.09, indexState: 'playback', browseSourcesView: 'grid', loadingBar: true };
export const useUiSettings = create<UiSettingsStore>(() => ({ settings: { ...DEFAULTS }, backgrounds: null }));
on('pushBackgrounds', (d: any) => { if (!d) { return; } const list = (d.available || []).map((bg: any) => ({ ...bg, path: HOST + '/backgrounds/' + bg.path, thumbnail: HOST + '/backgrounds/' + bg.thumbnail })); useUiSettings.setState({ backgrounds: { ...d, list } }); });
on('pushUiSettings', (d: any) => { if (d) { useUiSettings.setState({ settings: { ...useUiSettings.getState().settings, ...d } }); } });
emit('getUiSettings');
