/** The theme's own sections on Volumio's Appearance page: the theme switch and the ambient display rows. */
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useTheme, type ThemeMode } from '../../core/store/theme';
import { useCompanion } from '../../core/store/companion';
import { useAmbient, DELAYS, type AmbientSettings } from '../../core/store/ambient';
import { useScreenOn } from '../../core/store/screenOn';
import { useScreenPrefs, type TextSize } from '../../core/store/screenPrefs';
import { useToasts } from '../../core/store/toast';

const MODES: ThemeMode[] = ['dark', 'light', 'system'];
const glyph = (m: ThemeMode) => m === 'dark' ? 'dark_mode' : (m === 'light' ? 'light_mode' : 'contrast');
const label = (m: ThemeMode) => m === 'dark' ? 'Dark' : (m === 'light' ? 'Light' : 'System');

export default function AppearanceSlot() {
  const theme = useTheme();
  const companion = useCompanion();
  const ambient = useAmbient();
  const screenOn = useScreenOn();
  const prefs = useScreenPrefs();
  const SIZES: { k: TextSize; l: string }[] = [{ k: 's', l: 'Small' }, { k: 'm', l: 'Normal' }, { k: 'l', l: 'Large' }, { k: 'xl', l: 'Extra large' }];
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
  return (
    <>
      <div className="panel panel-default aw-theme-section" data-section-id="aw-theme">
        <div className="panel-heading"><h3 className="panel-title">Theme</h3></div>
        <div className="panel-body">
          {!companion.available ? (
            <div className="aw-theme-card aw-theme-card--inline">
              <div className="aw-theme-card__text"><div className="aw-theme-card__title">Dark or light</div><div className="aw-theme-card__hint">Pick one, or follow this device. Remembered in this browser only — a screen driven by the player keeps its own choice (dark unless set there).</div></div>
              {pick(true, 'aw-theme-pick__label', (m) => !!theme.choice && theme.choice === m, (m) => theme.set(m))}
            </div>
          ) : (
            <div className="aw-theme-card aw-theme-card--inline">
              <div className="aw-theme-card__text"><div className="aw-theme-card__title">Dark or light</div><div className="aw-theme-card__hint">One theme for every screen of this player — this browser, the display it drives, the phone. Kept on the player; takes effect at once, everywhere.</div></div>
              {pick(true, 'aw-theme-pick__label', (m) => playerTheme === m, (m) => companion.set({ theme: m }))}
            </div>
          )}
        </div>
      </div>
        <div className="panel panel-default aw-theme-section aw-amb-section" data-section-id="aw-screen">
          <div className="panel-heading"><h3 className="panel-title">This screen</h3></div>
          <div className="panel-body">
            <div className="aw-amb-rows">
              <div className="aw-amb-row">
                <div className="aw-amb-row__text">
                  <div className="aw-amb-row__title">Keep the screen on while playing</div>
                  <div className="aw-amb-row__hint">This phone or tablet does not lock while music plays and this page is open — for following the lyrics, or a screen that is not the player's own. Remembered in this browser only.</div>
                </div>
                <button type="button" className={'aw-switch' + (screenOn.on ? ' on' : '')} role="switch" aria-checked={screenOn.on} aria-label="Keep the screen on while playing" onClick={() => screenOn.set(!screenOn.on)}><span className="aw-switch__knob" /></button>
              </div>
              <div className="aw-amb-row">
                <div className="aw-amb-row__text">
                  <div className="aw-amb-row__title">Now Playing text size</div>
                  <div className="aw-amb-row__hint">The title, the artist and the album on Now Playing. Larger for a display of an unusual shape, where the text reads too small; smaller to fit more.</div>
                </div>
                <div className="aw-seg mono" role="group" aria-label="Now Playing text size">{SIZES.map(s => <button key={s.k} type="button" className={prefs.textSize === s.k ? 'active' : ''} onClick={() => prefs.setTextSize(s.k)}>{s.l}</button>)}</div>
              </div>
              <div className="aw-amb-row">
                <div className="aw-amb-row__text">
                  <div className="aw-amb-row__title">Hide the volume control</div>
                  <div className="aw-amb-row__hint">For a player whose volume is set on the amplifier: the slider and the mute button leave the mini player and Now Playing. The player's volume is unchanged.</div>
                </div>
                <button type="button" className={'aw-switch' + (prefs.hideVolume ? ' on' : '')} role="switch" aria-checked={prefs.hideVolume} aria-label="Hide the volume control" onClick={() => prefs.setHideVolume(!prefs.hideVolume)}><span className="aw-switch__knob" /></button>
              </div>
            </div>
          </div>
        </div>
      <div className="panel panel-default aw-theme-section aw-amb-section" data-section-id="aw-ambient">
        <div className="panel-heading"><h3 className="panel-title">Ambient display</h3></div>
        <div className="panel-body">
          <div className="aw-amb-rows">
            <div className="aw-amb-row">
              <div className="aw-amb-row__text">
                <div className="aw-amb-row__title">Ambient after idle</div>
                <div className="aw-amb-row__hint">Shows the cover and a clock when nobody touches the screen; Always keeps the display in it, a touch brings the interface back for a minute.{companion.available ? <span>&nbsp;Kept on the player, for every screen it drives.</span> : <span>&nbsp;Remembered in this browser only — install the Artwork One Companion (part of the installer) to set it for the player's own display from here.</span>}{!ambient.kiosk ? <span>&nbsp;This browser is not the player's display; add <code>?kiosk=1</code> to the address to try it here.</span> : null}</div>
              </div>
              <button type="button" className={'aw-switch' + (draft.on ? ' on' : '')} role="switch" aria-checked={draft.on} aria-label="Ambient after idle" onClick={() => setDraft({ ...draft, on: !draft.on })}><span className="aw-switch__knob" /></button>
            </div>
            <div className="aw-amb-row">
              <div className="aw-amb-row__title">Delay</div>
              <div className="aw-seg mono" role="group" aria-label="Delay">{DELAYS.map(d => <button key={d} type="button" className={draft.delay === d ? 'active' : ''} onClick={() => setDraft({ ...draft, delay: d })}>{d === 0 ? 'NEVER' : d === -1 ? 'ALWAYS' : (d === 10 ? '10 MIN' : d)}</button>)}</div>
            </div>
            <div className="aw-amb-row">
              <div className="aw-amb-row__title">Layout</div>
              <label className="aw-select"><select value={draft.layout} onChange={(e) => setDraft({ ...draft, layout: e.target.value as any })} aria-label="Layout"><option value="cover">Cover-led</option><option value="clock">Clock-led</option><option value="bleed">Full-bleed</option></select><Icon name="expand_more" /></label>
            </div>
            {draft.layout === 'bleed' ? <div className="aw-amb-row"><div className="aw-amb-row__hint">Full-bleed shows the cover unblurred and keeps a dark band under the text, in the light theme too — paper over a photo is unreadable.</div></div> : null}
            <div className="aw-amb-row">
              <div className="aw-amb-row__title">Clock format</div>
              <div className="aw-seg mono" role="group" aria-label="Clock format"><button type="button" className={draft.clock === '24' ? 'active' : ''} onClick={() => setDraft({ ...draft, clock: '24' })}>24 H</button><button type="button" className={draft.clock === '12' ? 'active' : ''} onClick={() => setDraft({ ...draft, clock: '12' })}>12 H</button></div>
            </div>
            <div className="aw-amb-row">
              <div className="aw-amb-row__text">
                <div className="aw-amb-row__title">Text size on the display</div>
                <div className="aw-amb-row__hint">Now Playing's title, artist and album on the player's own screen — larger for a display of an unusual shape. Phones and computers keep their own choice, under This screen.</div>
              </div>
              <div className="aw-seg mono" role="group" aria-label="Text size on the display">{SIZES.map(s => <button key={s.k} type="button" className={draft.textSize === s.k ? 'active' : ''} onClick={() => setDraft({ ...draft, textSize: s.k })}>{s.l.toUpperCase()}</button>)}</div>
            </div>
            <div className="aw-amb-row">
              <div className="aw-amb-row__text"><div className="aw-amb-row__title">Hide the volume on the display</div><div className="aw-amb-row__hint">For a player whose volume is set on the amplifier.</div></div>
              <button type="button" className={'aw-switch' + (draft.hideVolume ? ' on' : '')} role="switch" aria-checked={draft.hideVolume} aria-label="Hide the volume on the display" onClick={() => setDraft({ ...draft, hideVolume: !draft.hideVolume })}><span className="aw-switch__knob" /></button>
            </div>
            <div className="aw-amb-row">
              <div className="aw-amb-row__text"><div className="aw-amb-row__title">Night hours</div><div className="aw-amb-row__hint">Dims the ambient screen. Playback is unaffected.</div></div>
              <div className="aw-amb-night">
                <button type="button" className={'aw-switch aw-switch--sm' + (draft.night ? ' on' : '')} role="switch" aria-checked={draft.night} aria-label="Night hours" onClick={() => setDraft({ ...draft, night: !draft.night })}><span className="aw-switch__knob" /></button>
                <input className="aw-time mono" type="text" inputMode="numeric" maxLength={5} placeholder="23:00" value={draft.nightFrom} onChange={(e) => setDraft({ ...draft, nightFrom: e.target.value })} disabled={!draft.night} aria-label="Night from" />
                <span className="aw-amb-night__dash">–</span>
                <input className="aw-time mono" type="text" inputMode="numeric" maxLength={5} placeholder="07:00" value={draft.nightTo} onChange={(e) => setDraft({ ...draft, nightTo: e.target.value })} disabled={!draft.night} aria-label="Night to" />
              </div>
            </div>
          </div>
          <div className="form-group aw-amb-save"><div className="control-buttons"><button type="button" className="btn btn-info" onClick={save}>Save</button></div></div>
        </div>
      </div>
    </>
  );
}
