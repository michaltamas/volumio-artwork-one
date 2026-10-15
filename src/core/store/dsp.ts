/**
 * FusionDsp's quick controls, as Manifest and Nova offer them beside the outputs: effects on/off and
 * the preset, without opening the plugin's page. Read from the plugin's own settings page
 * (`getDSPUiConfig` → `pushDSPUiConfig`, the core sends FusionDsp's UIConfig): the "main" section shows
 * an Enable button while the effects are off and a Disable button while they are on; "advanced"
 * holds the preset select (`usethispreset`); "choosedsp" names the DSP, and with the convolution
 * filter or the pure CamillaDSP GUI there are no presets (with the latter, no switch either).
 * The changes go through the same calls as there: callMethod audio_interface/fusiondsp
 * enableeffect / disableeffect / usethispreset {usethispreset: option}.
 */
import { create } from 'zustand';
import { emit, on } from '../socket';

export const DSP_ENDPOINT = 'audio_interface/fusiondsp';
export const DSP_PAGE = '/plugin/audio_interface-fusiondsp';

export interface DspPreset { value: any; label: string }
interface DspStore {
  available: boolean;          // FusionDsp installed and enabled
  active: boolean | null;      // the effects (null: not read yet)
  presets: DspPreset[];
  preset: DspPreset | null;
  presetsOff: boolean;         // a DSP without presets (convolution filter, CamillaDSP GUI)
  switchOff: boolean;          // the CamillaDSP GUI: no switch either
  refresh: () => void;
  toggle: () => void;
  choose: (p: DspPreset) => void;
}

const label = (o: any) => o && typeof o === 'object' ? String(o.label ?? o.value ?? '') : String(o ?? '');

export const useDsp = create<DspStore>((set, get) => ({
  available: false, active: null, presets: [], preset: null, presetsOff: false, switchOff: false,
  refresh: () => { emit('getInstalledPlugins'); },
  toggle: () => {
    const on = !!get().active;
    emit('callMethod', { endpoint: DSP_ENDPOINT, method: on ? 'disableeffect' : 'enableeffect', data: '' });
    set({ active: !on });   // shown at once; the plugin's page read again confirms it
    window.setTimeout(() => emit('getDSPUiConfig'), 600);
  },
  choose: (p) => {
    emit('callMethod', { endpoint: DSP_ENDPOINT, method: 'usethispreset', data: { usethispreset: p.value !== undefined && typeof p.value === 'object' ? p.value : { value: p.value, label: p.label } } });
    set({ preset: p });
    window.setTimeout(() => emit('getDSPUiConfig'), 600);
  },
}));

on('pushInstalledPlugins', (list: any) => {
  if (!Array.isArray(list)) { return; }
  const has = list.some((p: any) => p && p.name === 'fusiondsp' && p.enabled);
  useDsp.setState(has ? { available: true } : { available: false, active: null, presets: [], preset: null });
  if (has) { emit('getDSPUiConfig'); }
});

on('pushDSPUiConfig', (conf: any) => {
  const sections: any[] = conf && Array.isArray(conf.sections) ? conf.sections : [];
  if (!sections.length) { return; }
  let active: boolean | null = null, presets: DspPreset[] = [], preset: DspPreset | null = null, presetsOff = false, switchOff = false;
  sections.forEach((s: any) => {
    const content: any[] = s && Array.isArray(s.content) ? s.content : [];
    if (s.id === 'main') { content.forEach((c: any) => { if (c && c.id === 'enableeffect') { active = false; } if (c && c.id === 'disableeffect') { active = true; } }); }
    if (s.id === 'advanced') {
      content.forEach((c: any) => {
        if (!c || c.id !== 'usethispreset') { return; }
        presets = (Array.isArray(c.options) ? c.options : []).map((o: any) => ({ value: o, label: label(o) })).filter((o: DspPreset) => o.label !== '');
        const v = c.value; const vKey = JSON.stringify(v && typeof v === 'object' ? v.value : v);
        preset = presets.find(p => JSON.stringify(p.value && typeof p.value === 'object' ? p.value.value : p.value) === vKey) || (v ? { value: v, label: label(v) } : null);
      });
    }
    if (s.id === 'choosedsp') {
      content.forEach((c: any) => { if (c && c.id === 'selectedsp') { const d = c.value && typeof c.value === 'object' ? c.value.value : c.value; presetsOff = d === 'convfir' || d === 'purecgui'; switchOff = d === 'purecgui'; } });
    }
  });
  useDsp.setState({ active, presets, preset, presetsOff, switchOff });
});
