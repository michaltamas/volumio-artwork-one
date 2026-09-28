/** MyVolumio "Edit profile" (the theme's own template): page head, avatar tile, the settings rows, the subscription card. */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHead from '../../components/PageHead';
import Crumbs from '../../components/browse/Crumbs';
import { useAuth, showError, type DbUser } from '../../core/store/auth';
import { useModal } from '../../core/store/modal';
import { paddleOverride } from '../../core/myvolumio/paddle';
import { AvatarImage, DURATION, longDate, openTerms, planDurationOf } from './parts';
import Spinner from '../../components/Spinner';

export default function EditProfile() {
  const nav = useNavigate(); const user = useAuth(s => s.user);
  const [form, setForm] = useState<Record<string, any>>({});
  const [passwordCheck, setPasswordCheck] = useState('');
  const [emailChanged, setEmailChanged] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (user) { const f: Record<string, any> = {}; Object.keys(user).forEach(k => { if (!k.startsWith('$') && k !== 'forEach') { f[k] = (user as any)[k]; } }); setForm(v => ({ ...f, password: v.password || '' })); } }, [user]);
  const goProfile = () => nav('/myvolumio/profile');
  const filled = useAuth(s => s.isUserFilledWithMandatory);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [k]: e.target.value }));

  const doEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) { return; }
    const jobs: Promise<void>[] = [];
    if (form.password) { if (form.password !== passwordCheck) { showError('Password do not match'); return; } jobs.push(useAuth.getState().updatePassword(form.password)); }
    if (emailChanged) { jobs.push(useAuth.getState().updateEmail(form.email)); }
    Promise.all(jobs).then(() => {
      const u: DbUser = { ...user };
      Object.keys(form).forEach(k => { if (!k.startsWith('$') && k !== 'forEach') { (u as any)[k] = form[k]; } });
      return useAuth.getState().saveUserData(u).then(goProfile);
    }).catch(showError);
  };
  const saveAvatar = () => {
    if (!user || !avatarFile) { return; }
    setUploading(true);
    useAuth.getState().changeAvatar(avatarFile, user.uid).then(url => { setUploading(false); setAvatarChanged(false); setForm(v => ({ ...v, photoUrl: url })); }).catch(e => { setUploading(false); showError(e); });
  };
  const deleteUser = async () => {
    if (!user || !(await useModal.getState().confirm({ title: 'Delete user?', message: 'Are you sure you want to delete your account? All your profile data, subscriptions and settings will be deleted' }))) { return; }
    setDeleting(true);
    useAuth.getState().deleteUser(user).then(() => { setDeleting(false); nav('/myvolumio/access'); }).catch(e => { setDeleting(false); showError(e); });
  };
  const active = () => !!(user && user.planData && user.planData.status && ['active', 'trialing', 'past_due'].indexOf(user.planData.status) > -1);
  const status = () => { const s = user && user.planData && user.planData.status; return s === 'active' ? 'Active' : s === 'trialing' ? 'In trial period' : s === 'past_due' ? 'Problems with your payment method, please update it' : 'Inactive'; };
  const signupDate = () => { const s = user && user.planData && user.planData.signupDate; if (!s) { return null; } const t = String(s).split(/[- :]/); return new Date(+t[0], +t[1] - 1, +t[2], +t[3], +t[4], +t[5]); };
  const lifetime = !!(user && user.planDuration === 'lifetime');

  if (user === null) {
    return (
      <div className="aw-pe aw-pe--login">
        <PageHead variant="profile" nav={<Crumbs root="MyVolumio" />} />
        <h1 className="aw-pe__title">Edit Profile</h1>
        <p className="aw-pe__note"><span className="aw-pe__note-dot"></span><span>You're not logged in. Please login to continue</span></p>
        <button type="button" className="aw-btn aw-btn--primary" onClick={() => nav('/myvolumio/login')}><span>Login</span></button>
      </div>
    );
  }
  return (
    <div className="aw-pe">
      <PageHead variant="profile" back={goProfile} backLabel="Profile" nav={<Crumbs root="MyVolumio" current="Edit Profile" onHome={goProfile} />} />
      <h1 className="aw-pe__title">Edit Profile</h1>
      <div className="aw-pe__grid">
        <div className="aw-pe__avatar">
          <AvatarImage imageOverride={form.photoUrl} />
          <label className="aw-btn aw-pe__file">
            <span className="material-symbols-rounded">photo_camera</span><span>Change profile picture</span>
            <input type="file" onChange={e => { const f = e.target.files && e.target.files[0]; if (f) { setAvatarFile(f); setAvatarChanged(true); } }} />
          </label>
          {avatarChanged ? <button type="button" className="aw-btn aw-btn--primary" onClick={saveAvatar}>{uploading ? <Spinner size={16} /> : null}<span>Save profile picture</span></button> : null}
        </div>
        <form className="aw-pe__form" role="form" onSubmit={doEdit}>
          <div className="aw-pe__eyebrow mono">PROFILE INFORMATION</div>
          {!filled(user) ? <div className="aw-pe__note"><span className="aw-pe__note-dot"></span><span>Complete your profile information</span></div> : null}
          <label className="aw-pe__row"><span className="aw-pe__label"><span>First Name</span> *</span><input className="form-control" type="text" value={form.firstName || ''} onChange={set('firstName')} required pattern=".{2,}" /></label>
          <label className="aw-pe__row"><span className="aw-pe__label"><span>Last Name</span> *</span><input className="form-control" type="text" value={form.lastName || ''} onChange={set('lastName')} required pattern=".{2,}" /></label>
          <label className="aw-pe__row"><span className="aw-pe__label"><span>Email Address</span> *</span><input className="form-control" type="email" required value={form.email || ''} onChange={e => { set('email')(e); setEmailChanged(true); }} /></label>
          <label className="aw-pe__row"><span className="aw-pe__label">Password</span><input className="form-control" type="password" value={form.password || ''} onChange={set('password')} placeholder="Leave blank to keep current" autoComplete="new-password" /></label>
          <label className="aw-pe__row"><span className="aw-pe__label">Confirm password</span><input className="form-control" type="password" value={passwordCheck} onChange={e => setPasswordCheck(e.target.value)} autoComplete="new-password" /></label>
          <div className="aw-pe__actions"><button type="submit" className="aw-btn aw-btn--primary"><span>Save</span></button></div>
        </form>
      </div>
      <div className="aw-pe__section">
        <div className="aw-pe__eyebrow mono">MYVOLUMIO SUBSCRIPTION</div>
        <div className="aw-kv aw-pe__kv">
          <div className="aw-kv__row"><span>Status</span>{active() ? <span className="mono">{status().toUpperCase()}</span> : <span className="mono">INACTIVE</span>}</div>
          {active() ? <div className="aw-kv__row"><span>Plan</span><span className="mono">{String(user.plan || '').toUpperCase()} {(DURATION[planDurationOf(user)] || planDurationOf(user)).toUpperCase()}</span></div> : null}
          {active() && signupDate() ? <div className="aw-kv__row"><span>Signed up on</span><span className="mono">{longDate(signupDate()!)}</span></div> : null}
          {active() && user.planData && user.planData.nextPayment && !lifetime ? <div className="aw-kv__row"><span>Next payment</span><span className="mono">{user.planData.nextPayment.amount} {user.planData.nextPayment.currency} <span>on</span> {longDate(new Date(user.planData.nextPayment.date))}</span></div> : null}
        </div>
        <div className="aw-pe__sub-actions">
          <a className="aw-pe__link" href="#" onClick={e => { e.preventDefault(); openTerms(); }}>MyVolumio <span>Terms and Conditions</span></a>
          <span className="aw-pe__spacer"></span>
          {user.planData && user.planData.updateUrl && !lifetime ? <button type="button" className="aw-btn" onClick={() => paddleOverride(user.planData.updateUrl).catch(showError)}><span className="material-symbols-rounded">credit_card</span><span>Update Payment Method</span></button> : null}
          {user.planData && user.planData.cancelUrl && !lifetime ? <button type="button" className="aw-btn aw-btn--danger" onClick={() => nav('/myvolumio/subscription/cancel')}><span className="material-symbols-rounded">close</span><span>Cancel Subscription</span></button> : null}
          {!active() ? <button type="button" className="aw-btn aw-btn--primary" onClick={() => nav('/myvolumio/plans')}><span className="material-symbols-rounded">play_arrow</span><span>Subscribe</span></button> : null}
        </div>
      </div>
      {!lifetime ? (
        <div className="aw-pe__section aw-pe__danger">
          <button type="button" className="aw-btn aw-btn--danger" onClick={deleteUser}>
            {!deleting ? <span className="material-symbols-rounded">delete</span> : <Spinner size={18} />}
            <span>Delete Account</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
