/**
 * MyVolumio's shared pieces (the frame's directives, same markup): the glyph boxes, the avatar,
 * the current-plan card, the plan card with Paddle's checkout, the device table, the back
 * link, "already logged", and the route guards.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import { useAuth, showError, type DbUser } from '../../core/store/auth';
import { useModal } from '../../core/store/modal';
import { useMenu } from '../../core/store/menu';
import { useProducts, MONTHLY_PLAN, monthlyFromYearly, yearlyFromMonthly, yearlySaving, featureText, SHOW_SAVING_MESSAGE, type Product } from '../../core/myvolumio/products';
import { paddleCheckout } from '../../core/myvolumio/paddle';
import { fb } from '../../core/myvolumio/firebase';
import * as api from '../../core/myvolumio/api';

/* ---- the frame's glyph boxes carry the theme's icon ---- */
const GLYPH: Record<string, string> = { 'log-out': 'logout', 'log-in': 'login', user: 'person', envelope: 'mail', 'triangle-top': 'arrow_drop_up', 'triangle-bottom': 'arrow_drop_down', ok: 'check', remove: 'close', 'warning-sign': 'warning', 'arrow-left': 'arrow_back', 'shopping-cart': 'shopping_cart', refresh: 'refresh', gift: 'redeem', globe: 'public' };
const FA: Record<string, string> = { user: 'person', cog: 'settings', 'user-circle-o': 'account_circle', 'check-circle-o': 'check_circle', heart: 'favorite', play: 'play_arrow', trash: 'delete', random: 'shuffle', question: 'help', lock: 'lock', 'info-circle': 'info', envelope: 'mail' };
export const Glyph = ({ g, i }: { g: string; i?: boolean }) => i ? <i className={'glyphicon glyphicon-' + g}><Icon name={GLYPH[g] || g} /></i> : <span className={'glyphicon glyphicon-' + g}><Icon name={GLYPH[g] || g} /></span>;
export const Fa = ({ f, className }: { f: string; className?: string }) => <i className={'fa fa-' + f + (className ? ' ' + className : '')}><Icon name={FA[f] || f} /></i>;

export const mediumDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const longDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
export const DURATION: Record<string, string> = { monthly: 'Monthly', yearly: 'Yearly', lifetime: 'Lifetime' };
export const planDurationOf = (user: DbUser | null) => (user && user.planDuration) || MONTHLY_PLAN;

/* ---- route guards: nothing until the user is known, then the redirects (not logged → access, logged → profile) ---- */
export function Guard({ need, verified, children }: { need: 'user' | 'null' | 'none'; verified?: boolean; children: ReactNode }) {
  const enabled = useAuth(s => s.enabled), ready = useAuth(s => s.ready), user = useAuth(s => s.user), checked = useAuth(s => s.checked);
  const filled = useAuth(s => s.isUserFilledWithMandatory);
  // a MyVolumio address on a fresh load switches the account on by itself (a reload stays on the page)
  useEffect(() => { if (!enabled) { useAuth.getState().enable(); } }, [enabled]);
  if (!enabled || !ready) { return null; }
  // no session here yet: wait for the player's own login before picking Access or the profile
  if (!user && !checked && need !== 'none') { return null; }
  if (need === 'user' && !user) { return <Navigate to="/myvolumio/access" replace />; }   // AUTH_REQUIRED
  if (need === 'user' && verified && !filled(user)) { return <Navigate to="/myvolumio/profile/edit" replace />; }
  if (need === 'null' && user) { return <Navigate to="/myvolumio/profile" replace />; }   // MYVOLUMIO_USER_ALREADY_LOGGED
  return <>{children}</>;
}

/* ---- avatar: the photo, else the initial ---- */
export function AvatarImage({ imageOverride }: { imageOverride?: string | null }) {
  const user = useAuth(s => s.user);
  const url = imageOverride || (user && user.photoUrl) || null;
  const initial = ((user && (user.firstName || user.email)) || '?').charAt(0);
  return (
    <my-volumio-avatar-image>
      <div className="avatar-image-box">
        {url ? <div className="avatar-image img-circle img-responsive" style={{ backgroundImage: `url('${url}')` }} /> : <div className="avatar-letter" data-initial={initial}><ng-letter-avatar /></div>}
      </div>
    </my-volumio-avatar-image>
  );
}

/* ---- the current plan ---- */
export function CurrentPlanCard({ action }: { action: 'upgrade' | 'profile' }) {
  const user = useAuth(s => s.user); const nav = useNavigate();
  if (!user) { return null; }
  const free = user.plan === undefined || user.plan === null || user.plan === 'free';
  const lifetime = user.planDuration === 'lifetime';
  return (
    <my-volumio-current-plan-card>
      <div className="myvolumio-current-plan-card">
        <div className=" plans-table">
          <div className="panel panel-primary">
            <div className="panel-heading"><h3 className="panel-title">Current plan</h3></div>
            <div className="panel-body">
              <div className="the-price">
                <h1>{String(user.plan || 'FREE').toUpperCase()}</h1>
                {user.expire_at ? <small><span>Expiring on</span>: {mediumDate(new Date(user.expire_at * 1000))}</small> : null}
                {!free ? <small style={{ textTransform: 'capitalize' }}>{DURATION[planDurationOf(user)] || planDurationOf(user)}</small> : null}
              </div>
            </div>
            <div className="panel-footer">
              {action === 'profile' ? <a onClick={() => nav('/myvolumio/profile')} className="btn btn-success btn-labeled"><span className="btn-label"><Glyph g="user" i /></span><span>Your profile</span></a> : null}
              {!lifetime && action === 'upgrade' ? <button type="button" className="btn btn-labeled btn-success" onClick={() => nav('/myvolumio/plans')}><span className="btn-label"><Glyph g="triangle-top" i /></span><span>Change plan</span></button> : null}
            </div>
          </div>
        </div>
      </div>
    </my-volumio-current-plan-card>
  );
}

/* ---- Paddle's checkout button with its coupon disclosure ---- */
export function PaddlePayButton({ product, userId, userEmail, planDuration, isTrial, buttonLabel, buttonClass }: { product: Product; userId: string; userEmail: string; planDuration: string; isTrial: boolean; buttonLabel?: string; buttonClass?: string }) {
  const nav = useNavigate();
  const [coupon, setCoupon] = useState('');
  const label = buttonLabel === undefined ? 'Buy now' : buttonLabel;
  const onCoupon = (v: string) => { setCoupon(v); useProducts.getState().setTrialOverride(v.length > 0); };
  const pay = () => {
    const price = product.prices && product.prices[planDuration];
    const paddleId = price ? price.paddleId : undefined;
    if (paddleId === undefined || !Number.isInteger(paddleId)) { alert('Error, no transaction occurred, no paddleId found.'); return; }
    const props: Record<string, any> = {
      product: paddleId, email: userEmail, passthrough: { email: userEmail, uid: userId },
      successCallback: () => { nav('/myvolumio/payment/success'); },
      closeCallback: () => { showError('Complete checkout'); },
    };
    if (coupon) { props.coupon = coupon; }
    else {
      let trialDays: any = '', trialDaysAuth: any = '', trialAuth: any = '', trialPrice: any = '';
      const t = price && price.trial;
      if (isTrial) { if (t && t.trialEnabled && t.trialDays && t.trialDaysAuth && t.trialAuth) { trialDays = t.trialDays; trialDaysAuth = t.trialDaysAuth; trialAuth = t.trialAuth; } trialPrice = 0; }
      props.trialDays = trialDays; props.trialDaysAuth = trialDaysAuth; props.price = trialPrice; props.auth = trialAuth;
    }
    paddleCheckout(props).catch(showError);
  };
  return (
    <paddle-pay-button>
      <div className="collapse__panel mb-4">
        <input className="collapse__checkbox" hidden type="checkbox" id="collapsePanel" />
        <label htmlFor="collapsePanel" className="collapse__panel__header d-flex align-items-center focus__helper" tabIndex={7}>
          <img className="collapse__indicator d-block mr-2" src="/app/assets-common/collapse-indicator.svg" alt="Collapse" />
          I have a coupon code
        </label>
        <div className="collapse__panel__content">
          <div className="form-group my-volumio__form-group">
            <input value={coupon} onChange={e => onCoupon(e.target.value)} type="text" id="coupon" className="form-control input-lg my-volumio__border-round my-volumio__text-input" placeholder="Coupon code" tabIndex={4} />
          </div>
        </div>
      </div>
      <button onClick={pay} className={'btn btn-lg btn-success' + (buttonClass ? ' ' + buttonClass : '')}>
        <i className="glyphicon glyphicon-shopping-cart"><Icon name="shopping_cart" /></i>
        {isTrial && !coupon ? <span>Try for free</span> : <span>{label}</span>}
      </button>
    </paddle-pay-button>
  );
}

/* ---- a plan (plans, subscribe, change, cancel) ---- */
export interface ShowMode { planDuration?: string }
export function PlanCard({ product, showMode, subscribe, cancellation, cancellationCallback, changeSubscription, changeSubscriptionCallback }: { product: Product; showMode?: ShowMode; subscribe?: boolean; cancellation?: boolean; cancellationCallback?: () => void; changeSubscription?: boolean; changeSubscriptionCallback?: () => void }) {
  const stored = useAuth(s => s.user); const nav = useNavigate();
  const trialOverride = useProducts(s => s.trialOverride);
  const user: DbUser = { ...(stored || { uid: '' }) };
  if (user.planDuration === undefined) { user.planDuration = 'monthly'; }
  const defaultBehaviour = !(subscribe === true || cancellation === true || changeSubscription === true);
  const duration = showMode && showMode.planDuration !== undefined ? showMode.planDuration : MONTHLY_PLAN;
  const price = product.prices ? product.prices[duration] : undefined;
  const lp = () => String((price && price.localizedPrice) || '').replace('.00', '');
  const trialOk = () => { const t = price && price.trial; return !!(user.isTrialAvailable !== false && t !== undefined && t.trialEnabled && t.trialDays !== undefined && t.trialDaysAuth !== undefined && t.trialAuth !== undefined); };
  const isTrialAvailable = () => !user.planData && trialOk();
  const trialDays = () => trialOk() ? price!.trial!.trialDays : '';
  const shownPrice = () => {
    if (!product || product.plan === 'free') { return 'FREE'; }
    let r = lp(); if (duration === 'yearly') { r = monthlyFromYearly(r); }
    return r + ' / month';
  };
  const priceMessage = () => duration === 'yearly' ? lp() + ' per year' : yearlyFromMonthly(lp()) + ' per year';
  const saveMessage = () => {
    if (duration !== 'yearly' || !SHOW_SAVING_MESSAGE || !product.prices || !product.prices.monthly || !product.prices.yearly) { return null; }
    return 'save ' + yearlySaving(String(product.prices.monthly.localizedPrice || '').replace('.00', ''), String(product.prices.yearly.localizedPrice || '').replace('.00', ''));
  };
  const paid = String(product.plan || '').toLowerCase() !== 'free';
  return (
    <my-volumio-plan-card>
      <div className="plan-box">
        <div className="panel panel-primary">
          <div className="panel-heading"><h3 className="panel-title">{product.name}</h3></div>
          <div className="panel-body">
            <div className="the-price">
              <h1>{shownPrice()}</h1>
              {paid ? <span style={{ fontSize: 'small' }}>{priceMessage()}</span> : null}{paid && saveMessage() ? <span>, <span style={{ fontSize: 'small' }}>{saveMessage()}</span></span> : null}<br />
              {isTrialAvailable() && !trialOverride ? <h4 className="trial-text">{trialDays()} Free days trial</h4> : null}
            </div>
            <table className="table"><tbody>
              {(product.features || []).map((f, i) => <tr key={i} className={i % 2 === 0 ? 'active' : ''}>{f === 'EMPTY' ? <td className="myvolumio-feature">&nbsp;</td> : <td className="myvolumio-feature">{featureText(f)}</td>}</tr>)}
            </tbody></table>
          </div>
          <div className="panel-footer">
            {product.plan === 'free' && defaultBehaviour ? (
              <div>
                {!user.plan || user.plan === 'free' ? <button type="button" className="btn btn-labeled btn-success"><span className="btn-label"><Glyph g="ok" i /></span><span>Current plan</span></button> : null}
                {user.plan !== product.plan && user.plan !== undefined ? <button onClick={() => nav('/myvolumio/subscription/cancel')} type="button" className="btn btn-labeled btn-default"><span className="btn-label"><Glyph g="triangle-bottom" i /></span><span>Change plan</span></button> : null}
              </div>
            ) : null}
            {defaultBehaviour && product.plan !== 'free' ? (
              <div>
                {user.plan === undefined || user.plan === null || user.plan === 'free' ? (
                  <div><button onClick={() => nav('/myvolumio/subscribe/' + product.plan + '/' + duration)} className="btn btn-success btn-labeled"><span className="btn-label"><Glyph g="triangle-top" i /></span>{!isTrialAvailable() ? <span>Change plan</span> : <span>Try for free</span>}</button></div>
                ) : null}
                {user.plan === product.plan && user.planDuration === duration ? <button type="button" className="btn btn-labeled btn-success"><span className="btn-label"><Glyph g="ok" i /></span><span>Current plan</span></button> : null}
                {(user.plan !== 'free' && user.plan !== undefined) && (user.planDuration !== duration || user.plan !== product.plan) ? (
                  <button onClick={() => nav('/myvolumio/subscription/change/' + product.plan + '/' + duration)} type="button" className="btn btn-labeled btn-default" disabled={user.planDuration === 'yearly' && duration === 'monthly'}><span className="btn-label"><Fa f="random" /></span><span>Change plan</span></button>
                ) : null}
              </div>
            ) : null}
            {subscribe ? <div><PaddlePayButton product={product} userId={user.uid} userEmail={user.email || ''} planDuration={duration} isTrial={isTrialAvailable()} buttonLabel="Subscribe" buttonClass="btn-block" /></div> : null}
            {cancellation ? <div><button onClick={cancellationCallback} type="button" className="btn btn-labeled btn-default"><span className="btn-label"><Glyph g="remove" i /></span><span>Cancel Subscription</span></button></div> : null}
            {changeSubscription ? <div><button onClick={changeSubscriptionCallback} type="button" className="btn btn-labeled btn-default"><span className="btn-label"><Fa f="random" /></span><span>Change your plan</span></button></div> : null}
          </div>
        </div>
      </div>
    </my-volumio-plan-card>
  );
}

/* ---- the devices MyVolumio is active on ---- */
interface Device { $id: string; name?: string; device?: string; enabled?: boolean; online?: boolean; host?: string; hwuuid?: string; [k: string]: any }
export function DeviceSelector() {
  const user = useAuth(s => s.user);
  const [devices, setDevices] = useState<Device[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [isPhone, setIsPhone] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => { const mq = window.matchMedia('(max-width: 767px)'); const h = () => setIsPhone(mq.matches); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h); }, []);
  const uid = user ? user.uid : '';
  useEffect(() => {
    if (!uid) { setDevices([]); return; }
    let off: (() => void) | null = null, alive = true;
    useProducts.getState().forUser(useAuth.getState().user).then(p => { if (alive) { setProduct(p || null); } }).catch(() => { /* no product: one device */ });
    fb().then(f => { if (!alive) { return; } off = f.D.onValue(f.D.ref(f.db, '/user_devices/' + uid), snap => { const v = snap.val() || {}; setDevices(Object.keys(v).map(k => ({ $id: k, ...(v[k] || {}) }))); }, e => showError(e)); }).catch(showError);
    return () => { alive = false; if (off) { off(); } };
  }, [uid]);
  const setEnabled = (d: Device, on: boolean) => setDevices(list => list.map(x => x.$id === d.$id ? { ...x, enabled: on } : x));
  const doEnable = (d: Device) => { useAuth.getState().getUserToken().then(t => t !== null ? api.enableDevice(t, uid, d.hwuuid || '') : null).catch(showError); };
  const enable = async (d: Device) => {
    if (!(await useModal.getState().confirm({ title: '', message: 'Are you sure to enable this device?' }))) { setEnabled(d, false); return; }
    const max = (product && product.maxDevices) || 1;
    let active = devices.filter(x => x.enabled === true).length;
    if (d.enabled === true) { active--; }
    if (active >= max) {
      if (await useModal.getState().confirm({ title: 'MyVolumio devices limit', message: 'You have already activated the max number of allowed MyVolumio Devices, please disable MyVolumio from one of the previous devices or upgrade your plan. If you continue the oldest MyVolumio Device will be disabled in favor of the new one. Do you wish to continue?' })) { doEnable(d); }
      else { setEnabled(d, false); }
      return;
    }
    doEnable(d);
  };
  const disable = async (d: Device) => {
    if (!(await useModal.getState().confirm({ title: '', message: 'Are you sure to disable this device?' }))) { setEnabled(d, true); return; }
    useAuth.getState().getUserToken().then(t => t !== null ? api.disableDevice(t, uid, d.hwuuid || '') : null).catch(showError);
  };
  const toggle = (d: Device) => { const on = !d.enabled; setEnabled(d, on); if (on) { enable({ ...d, enabled: on }); } else { disable({ ...d, enabled: on }); } };
  const del = async (d: Device) => { if (await useModal.getState().confirm({ title: '', message: 'Are you sure to delete this device?' })) { useAuth.getState().getUserToken().then(t => t !== null ? api.deleteDevice(t, uid, d.hwuuid || '') : null).catch(showError); } };
  const goto = (d: Device) => {
    const host = d.host || '';
    fb().then(f => f.D.set(f.D.ref(f.db, 'users/' + uid + '/lastHost'), host)).catch(() => { /* the device is still reachable */ }).then(() => { if (host) { window.location.href = /^https?:/.test(host) ? host : 'http://' + host; } });
  };
  return (
    <my-volumio-device-selector>
      <div id="device-selector">
        <table className="table tableSmall"><tbody>
          <tr>
            <th><span>Name</span></th>
            {!isPhone ? <th><span>Type</span></th> : null}
            <th><span>Enabled</span></th>
            <th></th>
          </tr>
          {devices.filter(d => d.name).map(d => (
            <tr key={d.$id}>
              <td>{d.name}</td>
              {!isPhone ? <td>{d.device}</td> : null}
              <td>
                <div className={'bootstrap-switch bootstrap-switch-wrapper bootstrap-switch-animate ' + (d.enabled ? 'bootstrap-switch-on' : 'bootstrap-switch-off')} onClick={() => toggle(d)}>
                  <div className="bootstrap-switch-container">
                    <span className="bootstrap-switch-handle-on bootstrap-switch-primary">ON</span>
                    <span className="bootstrap-switch-label">&nbsp;</span>
                    <span className="bootstrap-switch-handle-off bootstrap-switch-default">OFF</span>
                    <input type="checkbox" checked={!!d.enabled} readOnly aria-label={d.name} />
                  </div>
                </div>
              </td>
              <td className="commandCol ">
                <button onClick={() => goto(d)} className={'btn btn-info ' + (!d.enabled || !d.online ? 'invisible' : '')} type="button" title="Connect with this device "><Fa f="play" /></button>
                {!isPhone ? <button onClick={() => del(d)} type="button" className="btn btn-danger " title="Delete Device "><Fa f="trash" className="" /></button> : null}
              </td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </my-volumio-device-selector>
  );
}

export function BackButton({ to, label }: { to: string; label: string }) {
  const nav = useNavigate();
  return <my-volumio-back-button><a onClick={() => nav(to)} style={{ cursor: 'pointer', fontSize: 'large' }}><Glyph g="arrow-left" /> <span>{label}</span></a></my-volumio-back-button>;
}

export function AlreadyLogged() {
  const nav = useNavigate();
  return (
    <my-volumio-already-logged>
      <div>
        <h4 style={{ marginBottom: 16 }}>Already logged in</h4>
        <a onClick={() => nav('/myvolumio/profile')} className="btn btn-lg btn-success"><Glyph g="user" /> <span>Profile</span></a>
        <a onClick={() => { useAuth.getState().logOut().catch(showError); }} className="btn btn-lg btn-default pull-right"><Glyph g="log-out" /> <span>Logout</span></a>
      </div>
    </my-volumio-already-logged>
  );
}

export function VerificationCard() {
  const nav = useNavigate();
  return (
    <my-volumio-verification-card>
      <div className="panel panel-default"><div className="panel-body">
        <h4><Glyph g="warning-sign" /> <span></span></h4>
        <p>To use MyVolumio at its full potential, please click on the verification link we've sent to your email</p>
        <p><a style={{ cursor: 'pointer' }} onClick={() => useAuth.getState().resendEmailVerification().catch(showError)}>Did not receive the verification email? Resend my verification email now</a></p>
        <p><a style={{ cursor: 'pointer' }} onClick={() => useAuth.getState().logOut().then(() => nav('/myvolumio/access')).catch(e => alert(errorTextOf(e)))}>I have already verified my account, make me log-in again now!</a></p>
      </div></div>
    </my-volumio-verification-card>
  );
}
const errorTextOf = (e: any) => (e && e.message) || String(e);

export const openTerms = () => useModal.getState().open('myv-terms', { title: 'Terms and conditions' });
export const useHasMyVolumio = () => useMenu(s => s.hasMyVolumio());

/* ---- the page head the phone shows on every MyVolumio page: hamburger, back, "MyVolumio / … / here" ---- */
export function MyvHead({ trail, current, back }: { trail?: [string, string][]; current?: string; back?: string }) {
  const nav = useNavigate();
  const steps: [string, string][] = [['MyVolumio', '/myvolumio/profile'], ...(trail || [])];
  return (
    <PageHead variant="settings" back={back ? () => nav(back) : undefined} backLabel="Back" nav={
      <nav className="aw-crumbs" aria-label="Breadcrumb">
        {steps.map(([label, to], i) => current || i < steps.length - 1
          ? [<a key={'a' + i} onClick={() => nav(to)}>{label}</a>, (current || i < steps.length - 1) ? <span key={'s' + i} className="aw-crumbs__sep">/</span> : null]
          : <span key={'c' + i} className="aw-crumbs__cur">{label}</span>)}
        {current ? <span className="aw-crumbs__cur">{current}</span> : null}
      </nav>
    } />
  );
}
