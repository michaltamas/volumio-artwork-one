/** MyVolumio signup (the frame's two-step page): the account, then the plan with Paddle's checkout. */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, showError, type DbUser } from '../../core/store/auth';
import { useProducts, monthlyFromYearly, yearlyFromMonthly, yearlySaving, featureText, SHOW_SAVING_MESSAGE, type Product } from '../../core/myvolumio/products';
import { paddleCheckout } from '../../core/myvolumio/paddle';
import { on } from '../../core/socket';
import { AlreadyLogged, Fa, openTerms, MyvHead } from './parts';

export default function Signup() {
  const nav = useNavigate(); const user = useAuth(s => s.user);
  const trialOverride = useProducts(s => s.trialOverride);
  const [step, setStep] = useState(1);
  const [initiated, setInitiated] = useState(false);
  const [newUser, setNewUser] = useState<DbUser | null>(null);
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '', passwordConfirm: '', terms: false, marketing: false });
  const [products, setProducts] = useState<Product[]>([]);
  const [productsObj, setProductsObj] = useState<Record<string, Product>>({});
  const [selected, setSelected] = useState('premium');
  const [duration, setDuration] = useState('yearly');
  const [coupon, setCoupon] = useState('');
  useEffect(() => { useProducts.getState().load().then(p => { setProductsObj(p); setProducts([p.free, p.premium].filter(Boolean) as Product[]); }).catch(showError); }, []);
  useEffect(() => on('userUpgradedFromDeviceCode', () => { if (location.pathname === '/myvolumio/signup') { nav('/myvolumio/profile'); } }), [nav]);

  const validate = () => {
    if (f.terms !== true) { showError('Please accept the Terms of Service'); return false; }
    if (f.password !== f.passwordConfirm) { showError('Password do not match'); return false; }
    return true;
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) { return; }
    setInitiated(true);
    useAuth.getState().signup({ firstName: f.firstName, lastName: f.lastName, password: f.password, email: f.email, marketingConsent: f.marketing, avatarId: 0, social: {}, country: '' })
      .then(u => { setNewUser(u); setStep(2); }, err => { showError(err); setInitiated(false); });
  };
  const price = (p: Product) => p.prices && p.prices[duration];
  const sel = productsObj[selected];
  const lp = () => String((sel && price(sel) && price(sel)!.localizedPrice) || '').replace('.00', '');
  const shownPrice = () => { let r = lp(); if (duration === 'yearly') { r = monthlyFromYearly(r); } return r + ' / month'; };
  const shownPriceMessage = () => duration === 'yearly' ? lp() + ' per year' : yearlyFromMonthly(lp()) + ' per year';
  const saveMessage = () => {
    if (duration !== 'yearly' || !SHOW_SAVING_MESSAGE || !sel || !sel.prices || !sel.prices.monthly || !sel.prices.yearly) { return null; }
    return 'save ' + yearlySaving(String(sel.prices.monthly.localizedPrice || '').replace('.00', ''), String(sel.prices.yearly.localizedPrice || '').replace('.00', ''));
  };
  const isTrial = () => !!(sel && price(sel) && price(sel)!.trial);
  const onCoupon = (v: string) => { setCoupon(v); useProducts.getState().setTrialOverride(v.length > 0); };
  const signupError = (m: string) => showError('Something went wrong during your signup. Please contact our support at support@volumio.org providing the following error information: ' + m);
  const pay = () => {
    if (selected === 'free') { nav('/myvolumio/profile'); return; }
    const pr = sel && price(sel); const paddleId = pr ? pr.paddleId : undefined;
    let trialDays: any = '', trialDaysAuth: any = '', trialPrice: any = '', trialAuth: any = '';
    if (isTrial()) { const t = pr!.trial!; if (t.trialEnabled && t.trialDays && t.trialDaysAuth && t.trialAuth) { trialDays = t.trialDays; trialDaysAuth = t.trialDaysAuth; trialAuth = t.trialAuth; } trialPrice = 0; }
    if (paddleId === undefined || !Number.isInteger(paddleId)) { signupError('no paddleId found'); return; }
    let u = newUser;
    if (!u) { signupError('no authenticated user found'); return; }
    if (!u.email || !u.uid) { u = useAuth.getState().user; if (!u || !u.email || !u.uid) { signupError('missing email and uid'); return; } }
    const props: Record<string, any> = { product: paddleId, email: u.email, passthrough: { email: u.email, uid: u.uid }, successCallback: () => nav('/myvolumio/payment/success'), closeCallback: () => showError('Complete checkout') };
    if (coupon) { props.coupon = coupon; } else { props.trialDays = trialDays; props.trialDaysAuth = trialDaysAuth; props.price = trialPrice; props.auth = trialAuth; }
    paddleCheckout(props).catch(showError);
  };
  const field = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="box">
      <MyvHead current="Signup" back="/myvolumio/access" />
      <div id="authSignupPlugin" className="panel panel-default my-volumio__panel">
        <div className={'panel-body ' + (step === 1 ? 'show' : 'hide')}>
          <div style={{ display: user == null ? undefined : 'none' }}>
            <div className="omb_login">
              <div className="d-flex justify-content-end">
                {step === 1 ? <a onClick={() => nav('/myvolumio/login')} className="btn btn-outline pull-right"><Fa f="user" className="mr-2" /> <span>Login</span></a> : null}
              </div>
              <div className="row"><div className="col-xs-24 col-sm-16 col-md-12 col-sm-offset-4 col-md-offset-6">
                <div className="my-volumio__info-card my-volumio__border-round">
                  <span className="my-volumio__info-card__description">Upgrade your experience with premium services like TIDAL, TIDAL Connect and QOBUZ integration, CD Ripping, Advanced Metadata, Bluetooth input and much more.<br /><br /><a onClick={() => nav('/myvolumio/login')}>Already have an account?</a></span>
                </div>
              </div></div>
              <div className="row"><div className="col-xs-24 col-sm-16 col-md-12 col-sm-offset-4 col-md-offset-6">
                <form role="form" onSubmit={submit}>
                  <div className="row my-volumio__row-gutter">
                    <div className="col-xs-24 col-sm-12 col-md-12"><div className="form-group my-volumio__form-group"><input type="text" value={f.firstName} onChange={field('firstName')} id="first_name" className="form-control input-lg my-volumio__border-round my-volumio__text-input" placeholder="First Name" tabIndex={1} required pattern=".{2,}" /></div></div>
                    <div className="col-xs-24 col-sm-12 col-md-12"><div className="form-group my-volumio__form-group"><input type="text" value={f.lastName} onChange={field('lastName')} id="last_name" className="form-control input-lg my-volumio__border-round my-volumio__text-input" placeholder="Last Name" tabIndex={2} required pattern=".{2,}" /></div></div>
                  </div>
                  <div className="form-group my-volumio__form-group"><input type="email" value={f.email} onChange={field('email')} id="email" className="form-control input-lg my-volumio__border-round my-volumio__text-input" placeholder="Email Address" required tabIndex={4} /></div>
                  <div className="row my-volumio__row-gutter">
                    <div className="col-xs-24 col-sm-12 col-md-12"><div className="form-group my-volumio__form-group"><input type="password" value={f.password} onChange={field('password')} id="password" className="form-control input-lg my-volumio__border-round my-volumio__text-input" placeholder="Password" tabIndex={5} required pattern=".{8,}" /></div></div>
                    <div className="col-xs-24 col-sm-12 col-md-12"><div className="form-group my-volumio__form-group"><input type="password" value={f.passwordConfirm} onChange={field('passwordConfirm')} id="password_confirmation" className="form-control input-lg my-volumio__border-round my-volumio__text-input" placeholder="Confirm password" tabIndex={6} required pattern=".{8,}" /></div></div>
                  </div>
                  <div className="row mb-2"><div className="col-xs-22 col-sm-22 col-md-22 d-flex align-items-start">
                    <div className="button-checkbox" onClick={() => setF(v => ({ ...v, terms: !v.terms }))}>
                      <input type="checkbox" name="t_and_c" id="t_and_c" className="hidden my-volumio__checkbox" value="1" checked={f.terms} readOnly />
                      <label className="my-volumio__fake-checkbox" tabIndex={7} htmlFor="t_and_c"><div className="my-volumio__fake-checkbox__tick"><img src="/app/assets-common/fake-checkbox-tick--small.svg" alt="Tick" /></div></label>
                    </div>
                    <div><span>I agree to</span><strong className="label label-primary"> <a href="#" onClick={e => { e.preventDefault(); openTerms(); }}> MyVolumio <span>Terms and Conditions</span></a></strong></div>
                  </div></div>
                  <div className="row mb-10"><div className="col-xs-22 col-sm-22 col-md-22 d-flex align-items-start">
                    <div className="button-checkbox" onClick={() => setF(v => ({ ...v, marketing: !v.marketing }))}>
                      <input type="checkbox" name="marketingConsent" id="marketingConsent" className="hidden my-volumio__checkbox" value="1" checked={f.marketing} readOnly />
                      <label className="my-volumio__fake-checkbox" tabIndex={7} htmlFor="marketingConsent"><div className="my-volumio__fake-checkbox__tick"><img src="/app/assets-common/fake-checkbox-tick--small.svg" alt="Tick" /></div></label>
                    </div>
                    <div><span>Keep me updated with the latest Volumio news via email</span></div>
                  </div></div>
                  <div className="row mb-10"><div className="col-xs-24 col-md-24">
                    <button type="submit" className={'btn my-volumio__btn-primary my-volumio__border-round btn-block btn-lg' + (initiated ? ' disabled' : '')} tabIndex={7}>{initiated ? 'Creating account...' : 'Signup'}</button>
                  </div></div>
                </form>
              </div></div>
            </div>
          </div>
          {user != null ? <div id=""><AlreadyLogged /></div> : null}
        </div>
      </div>
      <div id="authSignupPlugin" className={'panel panel-default my-volumio__panel ' + (step === 2 ? 'show' : 'hide')}>
        <div className="panel-body">
          <div>
            <div className="row"><div className="col-xs-24 col-sm-16 col-md-12 col-sm-offset-4 col-md-offset-6">
              <div className="my-volumio__toggle-header">
                <div className="toggle-header__space"><h3>Go Premium</h3></div>
                <div className="my-volumio__toggle">
                  <input className="toggle__label-radio" checked={duration === 'yearly'} onChange={() => setDuration('yearly')} hidden type="radio" name="planPeriod" id="yearly" value="yearly" />
                  <input className="toggle__label-radio" checked={duration === 'monthly'} onChange={() => setDuration('monthly')} hidden type="radio" name="planPeriod" id="monthly" value="monthly" />
                  <div className="toggle__labels"><label htmlFor="yearly" className="toggle__label-text">Yearly</label><label htmlFor="monthly" className="toggle__label-text">Monthly</label></div>
                </div>
              </div>
            </div></div>
            <div className="row"><div className="col-xs-24 col-sm-16 col-md-12 col-sm-offset-4 col-md-offset-6">
              <div className="my-volumio__info-card my-volumio__border-round"><span className="my-volumio__info-card__description">Upgrade your experience with premium services like TIDAL, TIDAL Connect and QOBUZ integration, CD Ripping, Advanced Metadata, Bluetooth input and much more. <a href="https://volumio.com/volumio-premium-plan" target="_blank" rel="noreferrer">Discover all features</a>&nbsp;</span></div>
            </div></div>
            <div className="my-volumio__plan-grid">
              {products.filter(p => p.plan !== 'free').map(p => (
                <label key={p.plan} htmlFor={p.plan} className="plan__item focus__helper round" tabIndex={7}>
                  <input hidden className="plan__checkbox" type="radio" name="selectedPlan" value={p.plan} checked={selected === p.plan} onChange={() => setSelected(p.plan)} id={p.plan} />
                  <div className="plan__card">
                    <div className="plan__title d-flex align-items-center">
                      <div className="d-flex align-items-center"><div className="plan__fake-radio mr-4"><img className="plan__fake-radio__tick" src="/app/assets-common/fake-checkbox-tick--big.svg" alt="Tick" /></div><span>{p.name}</span></div>
                      <div className="flex-spacer mr-2"></div>
                      <img alt="MyVolumio Premium Icon" src={'/app/assets-common/myvolumio-' + p.plan + '-white-32.svg'} />
                    </div>
                    <div className="plan__pricing">
                      <div className="plan__trial">{price(p) && price(p)!.trial && !trialOverride ? <span>{price(p)!.trial!.trialDays} Free days trial</span> : null}&nbsp;</div>
                      <div className="plan__price">{selected === p.plan ? shownPrice() : ''}</div>
                      <div className="plan__period">{selected === p.plan ? shownPriceMessage() : ''}{selected === p.plan && saveMessage() ? <span style={{ fontSize: 'small' }}>, {saveMessage()}</span> : null}</div>
                    </div>
                    <div className="plan__features">{(p.features || []).filter(x => x !== 'EMPTY').map((x, i) => <div key={i} className="plan__feature">{featureText(x)}</div>)}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="row mb-10"><div className="col-xs-24 col-sm-16 col-md-12 col-sm-offset-4 col-md-offset-6">
              <div className="collapse__panel mb-4">
                <input className="collapse__checkbox" hidden type="checkbox" id="collapsePanel" />
                <label htmlFor="collapsePanel" className="collapse__panel__header d-flex align-items-center focus__helper" tabIndex={7}><img className="collapse__indicator d-block mr-2" src="/app/assets-common/collapse-indicator.svg" alt="Collapse" />I have a coupon code</label>
                <div className="collapse__panel__content"><div className="form-group my-volumio__form-group"><input value={coupon} onChange={e => onCoupon(e.target.value)} type="text" id="coupon" className="form-control input-lg my-volumio__border-round my-volumio__text-input" placeholder="Coupon code" tabIndex={4} /></div></div>
              </div>
              <button onClick={pay} className="btn my-volumio__btn-primary my-volumio__border-round btn-block btn-lg" tabIndex={7}>Finish sign up</button>
            </div></div>
            <div className="collapse__panel mb-4">
              <label onClick={() => nav('/playback')} className="collapse__panel__header d-flex align-items-center focus__helper" tabIndex={7}>No thanks, I am not interested</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
