/** The theme's own sections on Volumio's Appearance page, as the page's cards: the theme switch, and the ambient display rows with their Save. */
import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useTheme, type ThemeMode } from '../../core/store/theme';
import { useCompanion } from '../../core/store/companion';
import { useAmbient, DELAYS, type AmbientSettings } from '../../core/store/ambient';
import { useToasts } from '../../core/store/toast';
import { useTransparency } from '../../core/transparency';

const MODES: ThemeMode[] = ['dark', 'light', 'system'];
const glyph = (m: ThemeMode) => m === 'dark' ? 'dark_mode' : (m === 'light' ? 'light_mode' : 'contrast');
const label = (m: ThemeMode) => m === 'dark' ? 'Dark' : (m === 'light' ? 'Light' : 'System');

export default function AppearanceSlot() {
  const theme = useTheme();
  const companion = useCompanion();
  const ambient = useAmbient();
  const transparency = useTransparency(s => s.on);
  const SIZES: { k: 's' | 'm' | 'l' | 'xl'; l: string }[] = [{ k: 's', l: 'Small' }, { k: 'm', l: 'Normal' }, { k: 'l', l: 'Large' }, { k: 'xl', l: 'Extra large' }];
  const [draft, setDraft] = useState<AmbientSettings>({ ...ambient.settings });
  useEffect(() => { setDraft({ ...ambient.settings }); }, [ambient.settings]);
  const playerTheme = companion.settings.theme || null;
  const save = () => {
    const time = (v: any) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(v || '').trim());
    if (draft.night && !(time(draft.nightFrom) && time(draft.nightTo))) { useToasts.getState().show('warning', 'Night hours need a time like 23:00 and 07:00.', 'Ambient display'); return; }
    if (companion.available) { companion.set({ ambient: { ...draft } }); useToasts.getState().show('success', 'Ambient display settings saved for every screen of this player.', 'Ambient display'); }
    else { ambient.set({ ...draft }); useToasts.getState().show('success', 'Ambient display settings saved.', 'Ambient display'); }
  };
  const pick = (on: boolean, cls: string, active: (m: ThemeMode) => boolean, onPick: (m: ThemeMode) => void) => on ? (
    <div className="aw-theme-pick" role="group" aria-label="Theme">
      {MODES.map(m => <button key={m} type="button" className={active(m) ? 'active' : ''} onClick={() => onPick(m)} aria-pressed={active(m)}><Icon name={glyph(m)} /><span className={cls}>{label(m)}</span></button>)}
    </div>
  ) : null;
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...ambient.settings });
  const row = (kind: string, title: string, hint: React.ReactNode, control: React.ReactNode) => (
    <div className={'aw-sc-row aw-sc-row--' + kind}>
      <div className="aw-sc-row__text"><div className="aw-sc-row__label">{title}</div>{hint ? <div className="aw-sc-row__hint">{hint}</div> : null}</div>
      {control ? <div className="aw-sc-row__control">{control}</div> : null}
    </div>
  );
  const sw = (on: boolean, label: string, flip: () => void, sm?: boolean) => <button type="button" className={'aw-switch' + (sm ? ' aw-switch--sm' : '') + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} onClick={flip}><span className="aw-switch__knob" /></button>;
  return (
    <>
      <section className="aw-sc aw-theme-section" data-section-id="aw-theme">
        <header className="aw-sc__head"><span className="aw-sc__icon"><Icon name="contrast" /></span><div className="aw-sc__titles"><h3 className="aw-sc__title">Theme</h3></div></header>
        <div className="aw-sc__rows">
          {!companion.available
            ? row('seg', 'Dark or light', 'Pick one, or follow this device. Remembered in this browser only — a screen driven by the player keeps its own choice (dark unless set there).', pick(true, 'aw-theme-pick__label', (m) => !!theme.choice && theme.choice === m, (m) => theme.set(m)))
            : row('seg', 'Dark or light', 'One theme for every screen of this player — this browser, the display it drives, the phone. Kept on the player; takes effect at once, everywhere.', pick(true, 'aw-theme-pick__label', (m) => playerTheme === m, (m) => companion.set({ theme: m })))}
          {row('narrow', 'Transparency', transparency ? 'Bars, panels and menus are frosted glass over the cover. Remembered in this browser.' : 'Bars, panels and menus are solid: less to draw for a slow phone or tablet. Remembered in this browser.', sw(transparency, 'Transparency', () => useTransparency.getState().set(!transparency)))}
        </div>
      </section>
      <section className={'aw-sc aw-theme-section aw-amb-section' + (dirty ? ' is-dirty' : '')} data-section-id="aw-ambient">
        <header className="aw-sc__head"><span className="aw-sc__icon"><Icon name="wallpaper" /></span><div className="aw-sc__titles"><h3 className="aw-sc__title">Ambient display</h3><p className="aw-sc__desc">The cover and a clock on the player's own screen when nobody touches it.</p></div></header>
        <div className="aw-sc__rows">
          {row('narrow', 'Ambient after idle', <>{'Always keeps the display in it; a touch brings the interface back for a minute.'}{companion.available ? ' Kept on the player, for every screen it drives.' : ' Remembered in this browser only — install the Artwork One Companion (part of the installer) to set it for the player\'s own display from here.'}{!ambient.kiosk ? <> This browser is not the player's display; add <code>?kiosk=1</code> to the address to try it here.</> : null}</>, sw(draft.on, 'Ambient after idle', () => setDraft({ ...draft, on: !draft.on })))}
          {row('seg', 'Shown', draft.delay < 0 ? 'The display rests in the ambient screen; a touch brings the interface back for a minute.' : draft.delay === 0 ? 'The ambient screen never comes up on its own.' : 'After a while without a touch.', (
            <div className="aw-seg mono" role="group" aria-label="When the ambient screen shows">
              <button type="button" className={draft.delay > 0 ? 'active' : ''} onClick={() => setDraft({ ...draft, delay: draft.delay > 0 ? draft.delay : 2 })}>AFTER IDLE</button>
              <button type="button" className={draft.delay < 0 ? 'active' : ''} onClick={() => setDraft({ ...draft, delay: -1 })}>ALWAYS</button>
              <button type="button" className={draft.delay === 0 ? 'active' : ''} onClick={() => setDraft({ ...draft, delay: 0 })}>NEVER</button>
            </div>
          ))}
          {draft.delay > 0 ? row('seg', 'After', null, <div className="aw-seg mono" role="group" aria-label="Idle time">{DELAYS.filter(d => d > 0).map(d => <button key={d} type="button" className={draft.delay === d ? 'active' : ''} onClick={() => setDraft({ ...draft, delay: d })}>{d === 10 ? '10 MIN' : d}</button>)}</div>) : null}
          {row('narrow', 'Layout', draft.layout === 'bleed' ? 'Full-bleed shows the cover unblurred and keeps a dark band under the text, in the light theme too — paper over a photo is unreadable.' : null, <label className="aw-select"><select value={draft.layout} onChange={(e) => setDraft({ ...draft, layout: e.target.value as any })} aria-label="Layout"><option value="cover">Cover-led</option><option value="clock">Clock-led</option><option value="bleed">Full-bleed</option></select><Icon name="expand_more" /></label>)}
          {row('narrow', 'Clock format', null, <div className="aw-seg mono" role="group" aria-label="Clock format"><button type="button" className={draft.clock === '24' ? 'active' : ''} onClick={() => setDraft({ ...draft, clock: '24' })}>24 H</button><button type="button" className={draft.clock === '12' ? 'active' : ''} onClick={() => setDraft({ ...draft, clock: '12' })}>12 H</button></div>)}
          {row('seg', 'Text size on the display', 'Now Playing\'s title, artist and album on the player\'s own screen — larger for a display of an unusual shape. Phones and computers keep their own choice, under This screen.', <div className="aw-seg mono" role="group" aria-label="Text size on the display">{SIZES.map(s => <button key={s.k} type="button" className={draft.textSize === s.k ? 'active' : ''} onClick={() => setDraft({ ...draft, textSize: s.k })}>{s.l.toUpperCase()}</button>)}</div>)}
          {row('narrow', 'Keys and remotes wake the screen', draft.keysWake ? 'Any key brings the interface back, a remote\'s too (a Flirc or other USB IR receiver, a Bluetooth or USB keyboard).' : 'Keys and remotes leave the ambient screen up, so a remote can control playback. A touch or the mouse brings the interface back.', sw(draft.keysWake, 'Keys and remotes wake the screen', () => setDraft({ ...draft, keysWake: !draft.keysWake })))}
          {row('narrow', 'Transparency on the display', draft.transparency ? 'Frosted glass on the player\'s own screen.' : 'Solid surfaces on the player\'s own screen: smoother on a Raspberry Pi driving a large display.', sw(draft.transparency, 'Transparency on the display', () => setDraft({ ...draft, transparency: !draft.transparency })))}
          {row('narrow', 'Hide the volume on the display', 'For a player whose volume is set on the amplifier.', sw(draft.hideVolume, 'Hide the volume on the display', () => setDraft({ ...draft, hideVolume: !draft.hideVolume })))}
          {row('seg', 'Night hours', 'Dims the ambient screen. Playback is unaffected.', (
            <div className="aw-amb-night">
              {sw(draft.night, 'Night hours', () => setDraft({ ...draft, night: !draft.night }), true)}
              <input className="aw-time mono" type="text" inputMode="numeric" maxLength={5} placeholder="23:00" value={draft.nightFrom} onChange={(e) => setDraft({ ...draft, nightFrom: e.target.value })} disabled={!draft.night} aria-label="Night from" />
              <span className="aw-amb-night__dash">–</span>
              <input className="aw-time mono" type="text" inputMode="numeric" maxLength={5} placeholder="07:00" value={draft.nightTo} onChange={(e) => setDraft({ ...draft, nightTo: e.target.value })} disabled={!draft.night} aria-label="Night to" />
            </div>
          ))}
        </div>
        <footer className="aw-sc__foot">
          {dirty ? <span className="aw-sc__status mono"><i aria-hidden="true" />UNSAVED</span> : null}
          {dirty ? <button type="button" className="aw-sc__cancel" onClick={() => setDraft({ ...ambient.settings })}>Cancel</button> : null}
          <button type="button" className={'aw-sc__save' + (dirty ? ' is-on' : '')} onClick={save}>Save</button>
        </footer>
      </section>
    </>
  );
}
