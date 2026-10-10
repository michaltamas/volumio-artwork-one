/**
 * The first-run wizard (/wizard): the frame's own steps as the player pushes them —
 * language, name, output, done (and the ones this player does not ask for), a navigator over
 * them, the step counter and the Close / Previous / Next / Done bar. Its page darkens the
 * layout behind it, as the frame's did.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { on, emit, HOST } from '../core/socket';
import { useUiSettings } from '../core/store/uiSettings';
import { usePhone } from '../core/usePhone';
import { NetworkDrives, Wifi } from '../components/settings/CoreSections';
import Spinner from '../components/Spinner';

interface Step { name: string; type: string; show?: boolean }
interface Named { id?: string; name: string }
const LABELS: Record<string, string> = { LANGUAGE: 'Language', NAME: 'Name', OUTPUT: 'Output', NETWORK: 'Network', MUSIC: 'Music', FOLLOW: 'Follow', DONE: 'Done', VOLUMIOAPPS: 'Apps', DEVICECODE: 'Device Code', ADVANCEDSETTINGS: 'Experience' };
const stepLabel = (s: Step) => s.type === 'core' ? (LABELS[s.name.toUpperCase()] || 'WIZARD.' + s.name.toUpperCase()) : s.name;

/** the frame's select: a pill with the chosen label and a caret; the native list sits over it, unseen */
function WSelect({ id, value, options, label, onChange, placeholder }: { id: string; value: any; options: any[]; label: (o: any) => string; onChange: (o: any) => void; placeholder?: string }) {
  const idx = options.indexOf(value);
  return (
    <div id={id} className="ui-select-container ui-select-bootstrap dropdown">
      <div className="ui-select-match">
        <span className="btn btn-default form-control ui-select-toggle">
          {value ? <span className="ui-select-match-text pull-left">{label(value)}</span> : <span className="ui-select-placeholder text-muted">{placeholder}</span>}
          <i className="caret pull-right" />
        </span>
      </div>
      <input className="form-control ui-select-search" type="search" tabIndex={-1} readOnly aria-hidden="true" />
      <select className="wz-native" value={idx} onChange={(e) => onChange(options[+e.target.value])} aria-label={placeholder || id}>
        {options.map((o, i) => <option key={i} value={i}>{label(o)}</option>)}
      </select>
    </div>
  );
}

/** the frame's bootstrap-switch as it stands outside the settings pages: YES | knob | NO */
function WSwitch({ id, on: isOn, onChange }: { id: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={'bootstrap-switch bootstrap-switch-wrapper bootstrap-switch-medium bootstrap-switch-' + (isOn ? 'on' : 'off')} onClick={() => onChange(!isOn)} role="switch" aria-checked={isOn}>
      <div className="bootstrap-switch-container">
        <span className="bootstrap-switch-handle-on bootstrap-switch-primary">YES</span>
        <span className="bootstrap-switch-label">&nbsp;</span>
        <span className="bootstrap-switch-handle-off bootstrap-switch-default">NO</span>
        <input id={id} type="checkbox" checked={isOn} readOnly />
      </div>
    </div>
  );
}

export default function Wizard() {
  const nav = useNavigate();
  const phone = usePhone();
  const persistent = useUiSettings(s => (s.settings as any).persistentWizard === true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [current, setCurrent] = useState<Step | null>(null);
  const [language, setLanguage] = useState<any>(null);
  const [deviceName, setDeviceName] = useState<any>(null);
  const [outputs, setOutputs] = useState<any>(null);
  const [selectedDevice, setSelectedDevice] = useState<Named | null>(null);
  const [selectedI2s, setSelectedI2s] = useState<Named | null>(null);
  const [done, setDone] = useState<any>(null);
  const [donation, setDonation] = useState<any>('');
  const [customAmount, setCustomAmount] = useState('');
  const [deviceCode, setDeviceCode] = useState<any>(null);
  const [advanced, setAdvanced] = useState<any>(null);
  const [mail, setMail] = useState(''); const [subscribed] = useState(false);
  const stateRef = useRef<any>({});
  stateRef.current = { current, steps, language, deviceName, outputs, selectedDevice, selectedI2s, advanced };

  // the layout behind the wizard darkens, the wizard's column comes forward
  useEffect(() => {
    const wrapper = document.getElementById('contentWrapper'), scrim = document.getElementById('wizardScrim');
    if (wrapper) { wrapper.style.zIndex = '5'; } if (scrim) { scrim.style.display = 'block'; }
    return () => { try { if (wrapper) { wrapper.style.zIndex = '1'; } if (scrim) { scrim.style.display = 'none'; } } catch { /* gone */ } };
  }, []);

  useEffect(() => {
    const offs = [
      on('pushWizardSteps', (data: Step[]) => { setSteps(data || []); setCurrent((data || [])[0] || null); }),
      on('pushAvailableLanguages', (data: any) => {
        // the browser's language is the default when the player offers it
        const browser = String(navigator.language || 'en').split('-')[0].toLowerCase();
        const found = (data && data.available || []).find((l: any) => l.code === browser);
        setLanguage(found ? { ...data, defaultLanguage: found } : data);
      }),
      on('pushDeviceName', (data: any) => setDeviceName(data)),
      on('pushOutputDevices', (data: any) => { setOutputs(data); setSelectedDevice({ name: data.devices.active.name, id: data.devices.active.id }); if (data.i2s && data.i2s.enabled) { setSelectedI2s({ name: data.i2s.active }); } }),
      on('pushDonePage', (data: any) => { setDone(data); if (data && data.donation) { setDonation(data.donationAmount.donationAmount); } }),
      on('pushDeviceActivationCodeResult', (data: any) => setDeviceCode((d: any) => ({ ...(d || {}), activated: data.activated, error: data.error }))),
      on('pushDeviceActivationStatus', (data: any) => { let message = String(data.message || '') + ' ' + (data.plan || ''); if (data.email) { message += ' and associated with account ' + data.email; } setDeviceCode({ alreadyActivated: data.alreadyActivated, message }); }),
      on('pushExperienceAdvancedSettings', (data: any) => setAdvanced(data)),
      on('closeWizard', () => nav('/playback')),
    ];
    emit('getWizardSteps'); emit('getAvailableLanguages');
    return () => offs.forEach(off => off());
  }, [nav]);

  const index = (s: Step | null) => (s ? steps.indexOf(s) : -1);
  const gotoStep = (step: Step) => {
    const st = stateRef.current; const from = st.current ? String(st.current.name).toLowerCase() : '';
    // leaving a step applies what it asked for
    if (from === 'language' && st.language) { emit('setLanguage', { ...st.language, disallowReload: true }); emit('getWirelessNetworks', ''); }
    else if (from === 'name' && st.deviceName) { emit('setDeviceName', st.deviceName); }
    else if (from === 'output' && st.outputs) {
      if (st.outputs.i2s && st.outputs.i2s.enabled) { emit('setOutputDevices', { i2s: true, i2sid: { value: st.selectedI2s && st.selectedI2s.id, label: st.selectedI2s && st.selectedI2s.name }, output_device: { value: 1, label: st.selectedI2s && st.selectedI2s.name } }); }
      else { emit('setOutputDevices', { i2s: false, output_device: { value: st.selectedDevice && st.selectedDevice.id, label: st.selectedDevice && st.selectedDevice.name } }); }
    } else if (from === 'advancedsettings' && st.advanced) { emit('setExperienceAdvancedSettings', st.advanced.status.id); }
    setCurrent(step);
    // arriving on a step asks the player for its values
    const to = String(step.name).toLowerCase();
    if (to === 'name' && !st.deviceName) { emit('getDeviceName'); }
    else if (to === 'output') { emit('getOutputDevices'); }
    else if (to === 'advancedsettings') { emit('getExperienceAdvancedSettings'); }
    else if (to === 'devicecode') { emit('getDeviceActivationStatus'); }
    else if (to === 'done') { emit('getDonePage'); }
  };
  useEffect(() => { (window as any).awWizardGoto = (name: string) => { const s = stateRef.current.steps.find((x: Step) => x.name === name); if (s) { gotoStep(s); } }; return () => { delete (window as any).awWizardGoto; }; }); // eslint-disable-line react-hooks/exhaustive-deps
  const isFirst = index(current) === 0, isLast = index(current) === steps.length - 1;
  const skip = () => { emit('setWizardAction', { action: 'skip' }); nav('/playback'); };
  const finish = () => { nav('/playback'); emit('setWizardAction', { action: 'close' }); };
  const name = current ? String(current.name).toLowerCase() : '';
  const i2sOn = !!(outputs && outputs.i2s && outputs.i2s.enabled);
  const hostName = String(deviceName && deviceName.name || '').split(' ').join('-').toLowerCase();
  const codeOpen = deviceCode && deviceCode.activated !== true && deviceCode.alreadyActivated !== true;

  let view: React.ReactNode = null;
  if (current && current.type !== 'core') { view = <div />; }   /* the plugin steps' view is an empty file */
  else if (name === 'language') {
    view = <>
      <div id="logo-wizard"><img src={HOST + '/app/themes/artwork/assets/variants/artwork/graphics/artwork-logo-wizard.png'} alt="" /></div>
      <h4 className="text-center">Welcome, let's get started</h4>
      <div className="wizard-panel col-sm-10 col-sm-offset-7">
        <h3>Select your language</h3>
        <WSelect id="select-language" value={language && language.defaultLanguage} options={language && language.available || []} label={(o) => o.language} onChange={(o) => setLanguage({ ...language, defaultLanguage: o })} placeholder="Select language" />
      </div>
    </>;
  } else if (name === 'name') {
    view = <div className="wizard-panel col-sm-10 col-sm-offset-7">
      <h4 style={{ marginTop: 40 }}>Choose a unique name for your device</h4>
      <form onSubmit={(e) => e.preventDefault()}><input type="text" name="deviceName" className="form-control" value={deviceName && deviceName.name || ''} onChange={(e) => setDeviceName({ ...(deviceName || {}), name: e.target.value })} /></form>
      <div><br /><h4>This device will be available at the address:</h4>{' http://' + hostName + '.local '}</div>
    </div>;
  } else if (name === 'output') {
    view = <div className="wizard-panel col-sm-10 col-sm-offset-7">
      {outputs && outputs.i2s ? <div><h3 style={{ marginTop: 40 }}>I have an I2S DAC</h3><WSwitch id="outpu-switch" on={i2sOn} onChange={(v) => setOutputs({ ...outputs, i2s: { ...outputs.i2s, enabled: v } })} /></div> : null}
      <div style={{ display: i2sOn ? 'none' : undefined }}>
        <h3>Select your audio output</h3>
        <WSelect id="select-output" value={selectedDevice && (outputs && outputs.devices.available.find((d: any) => d.id === selectedDevice.id) || selectedDevice)} options={outputs && outputs.devices && outputs.devices.available || []} label={(o) => o.name} onChange={(o) => setSelectedDevice(o)} placeholder="Select device" />
      </div>
      <div style={{ display: i2sOn ? undefined : 'none' }}>
        <h3>Select your i2s DAC</h3>
        <WSelect id="select-i2s" value={selectedI2s && (outputs && outputs.i2s && outputs.i2s.available.find((d: any) => d.name === selectedI2s.name) || selectedI2s)} options={outputs && outputs.i2s && outputs.i2s.available || []} label={(o) => o.name} onChange={(o) => setSelectedI2s(o)} placeholder="Select i2s" />
      </div>
    </div>;
  } else if (name === 'done') {
    view = <div className="wizard-panel col-sm-12 col-sm-offset-5">
      <div className="row">
        {done && done.congratulations ? <h2 className="congratulations-message">{done.congratulations}</h2> : null}
        {done && done.title ? <h4>{done.title}</h4> : null}
        {done && done.message ? <p className="done-message">{done.message}</p> : null}
      </div>
      {done && done.donation ? <div className="row">
        {(done.donationAmount.amounts || []).map((a: any) => <button key={a} type="button" className={'btn btn-default' + (donation === a ? ' selected' : '')} onClick={() => setDonation(a)}>{a}</button>)}
        {' '}<input id="custom-amount" type="text" className="form-control" placeholder={done.donationAmount.customAmount} value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setDonation(e.target.value); }} />
        <form id="donate-button" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
          <input type="hidden" name="cmd" value="_donations" /><input type="hidden" name="business" value="info@volumio.org" /><input type="hidden" name="lc" value="EU" /><input type="hidden" name="amount" value={donation} /><input type="hidden" name="no_note" value="0" /><input type="hidden" name="cn" value="Add special instructions to the seller:" /><input type="hidden" name="no_shipping" value="2" /><input type="hidden" name="currency_code" value="EUR" /><input type="hidden" name="bn" value="PP-DonationsBF:btn_donateCC_LG.gif:NonHosted" />
          <br />
          <button className="btn btn-info donate-button fa fa-paypal" type="submit"><span className="material-symbols-rounded wz-paypal" aria-hidden="true">payments</span>Donate with paypal</button>
        </form>
        <br />
      </div> : null}
    </div>;
  } else if (name === 'follow') {
    view = <div className="wizard-panel col-sm-12 col-sm-offset-5">
      <div className="row"><h3>Social share</h3><a href="https://twitter.com/share" className="twitter-share-button" target="_blank" rel="noreferrer">Tweet</a></div>
      <br />
      <div className="row"><h3>Mail list subscription</h3>
        <form onSubmit={(e) => e.preventDefault()}><input id="EMAIL" type="text" className="form-control" placeholder="Email" value={mail} onChange={(e) => setMail(e.target.value)} /><br />{subscribed ? <div className="text-center">Subscribed successfully</div> : null}<br /><div><button className="btn btn-info" type="submit">Subscribe me</button></div></form>
      </div>
    </div>;
  } else if (name === 'music') {
    view = <><h5 className="h-wizard">To add your music, simply connect a USB Drive or click the button below to add your Network Drive</h5><div><NetworkDrives /></div></>;
  } else if (name === 'network') {
    view = <><h5 className="h-wizard">Select the wireless network you wish to connect</h5><WifiResult /><div id="wifiPlugin" className="panel panel-default"><div className="panel-body"><Wifi wizard persistentWizard={persistent} /></div></div></>;
  } else if (name === 'advancedsettings') {
    view = <div className="wizard-panel col-sm-10 col-sm-offset-7">
      <h4 style={{ marginTop: 40 }}>Let's tailor your user experience</h4><br />
      <h5>Do you prefer an easy to use system with only a simplified set of options or do you want full control over all advanced functions?</h5>
      <h6>This setting can be changed later in system settings</h6>
      <WSelect id="select-advanced-settings" value={advanced && advanced.status} options={advanced && advanced.options || []} label={(o) => o.label} onChange={(o) => setAdvanced({ ...advanced, status: o })} />
    </div>;
  } else if (name === 'devicecode') {
    view = <div className="wizard-panel col-sm-10 col-sm-offset-7">
      <h3 style={{ marginTop: 40 }}>Device Activation Code</h3>
      {codeOpen ? <span><h5>If you have received a Device Activation code with your device, enter it to take advantage of the exclusive features reserved for you.</h5><h5>Once done, click Validate Device Code</h5><h5>If you already entered your device code, there is no need to enter it again</h5></span> : null}
      <form onSubmit={(e) => e.preventDefault()}>{codeOpen ? <input type="text" name="deviceCode" className="form-control" value={deviceCode.code || ''} onChange={(e) => setDeviceCode({ ...deviceCode, code: e.target.value })} /> : null}</form>
      {codeOpen ? <button className="btn btn-info donate-button" type="submit" style={{ marginTop: 20 }} onClick={() => emit('setDeviceActivationCode', { code: deviceCode.code })} disabled={!deviceCode.code}>Validate Device Code</button> : null}
      {deviceCode && deviceCode.activated !== true && deviceCode.error && deviceCode.error.length ? <h5>Could not activate your device : {deviceCode.error}</h5> : null}
      {deviceCode && deviceCode.activated === true ? <h4>Your device has been successfully activated. You can now enjoy your exclusive features</h4> : null}
      {deviceCode && deviceCode.message ? <h5>{deviceCode.message}</h5> : null}
    </div>;
  } else if (name === 'volumioapps') {
    view = <><h5 className="h-wizard">For your convenience, you can also use our handy apps</h5>
      <div className="row">
        <div className="col-md-8 text-center"><a href="https://play.google.com/store/apps/details?id=volumio.browser.Volumio" target="_blank" rel="noreferrer"><img alt="Get it on Google Play" src={HOST + '/app/assets-common/graphics/android-app-store-get.png'} style={{ maxHeight: 100, padding: 20 }} /></a></div>
        <div className="col-md-8 text-center"><a href="https://itunes.apple.com/app/volumio/id1268256519?mt=8" target="_blank" rel="noreferrer"><img alt="Get it on App Store" src={HOST + '/app/assets-common/graphics/ios-app-store-get.png'} style={{ maxHeight: 100, padding: 20 }} /></a></div>
        <div className="col-md-8 text-center"><a href="https://www.amazon.com/INTUITU-di-Michelangelo-Guarise-Volumio/dp/B074CRD3LP/" target="_blank" rel="noreferrer"><img alt="Get it on Amazon" src={HOST + '/app/assets-common/graphics/amazon-app-store-get.png'} style={{ maxHeight: 100, padding: 20 }} /></a></div>
      </div></>;
  } else if (current) { view = <div />; }   /* a step without a view (software update, login, streaming services) shows nothing */

  return (
    <div id="wizard" className="volumio3">
      <div className="row">
        <div id="wizard-container" className="col-sm-18 col-sm-offset-3 col-xs-24">
          <div id="wizard-navigator">
            {steps.map(step => <span key={step.name}>{!phone ? <button className={'btn btn-link btn-navigator' + (current === step ? ' selected' : '')} type="button" onClick={() => gotoStep(step)}><span style={step.type !== 'core' ? { textTransform: 'capitalize' } : undefined}>{' ' + stepLabel(step) + ' '}</span></button> : null}</span>)}
          </div>
          {current ? <div className="row">{view}</div> : null}
          {!phone ? <div id="status-bar" className="row text-lef">{'Step ' + (index(current) + 1) + '/' + steps.length}</div> : null}
          <div id="button-bar" className="row text-right">
            {!isLast && !persistent ? <button type="button" className="btn btn-warning" onClick={skip}>Close</button> : null}{' '}
            {!isFirst && !phone ? <button type="button" className="btn btn-info" onClick={() => gotoStep(steps[index(current) - 1])}>Previous</button> : null}{' '}
            {!isFirst && phone ? <button type="button" className="btn btn-info" onClick={() => gotoStep(steps[index(current) - 1])}>{'<'}</button> : null}{' '}
            {!isLast ? <button type="button" className="btn btn-info" onClick={() => gotoStep(steps[index(current) + 1])}>Next</button> : null}{' '}
            {isLast && !persistent ? <button type="button" className="btn btn-info" onClick={finish}>Done</button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// what the wizard plugin says about the Wi-Fi connection: connecting (with a message), connected, or deferred
// to the end of the wizard (over its own hotspot) — Volumio's wizard-network.html, the panel above the list
function WifiResult() {
  const [res, setRes] = useState<any>(null);
  useEffect(() => on('pushWizardWirelessConnResults', (d: any) => setRes(d && typeof d === 'object' ? d : null)), []);
  if (!res) { return null; }
  return (
    <div id="wifiPlugin" className="panel panel-default aw-wizard-wifi-result">
      <div className="panel-body">
        {res.wait ? (
          <div id="wizard-wifi-spinner"><Spinner size={24} />{res.message ? <div id="wizard-wifi-message"><h4 className="text-center">{res.message}</h4></div> : null}</div>
        ) : (res.result ? <div id="wizard-wifi-message"><h4 className="text-center">{res.result}</h4></div> : null)}
      </div>
    </div>
  );
}
