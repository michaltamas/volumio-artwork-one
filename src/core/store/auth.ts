/**
 * MyVolumio's account (the frame's authService + angularfire): enabled by the menu's MyVolumio
 * entry, the Firebase user and their database record, kept in step with the player's backend
 * (the backend holds a token too: whichever side is logged in hands the other its token).
 */
import { create } from 'zustand';
import { fb, read, write, strip } from '../myvolumio/firebase';
import * as api from '../myvolumio/api';
import { on, emit, ask, connected } from '../socket';
import { useMenu } from './menu';
import { useModal } from './modal';

export interface DbUser {
  uid: string; email?: string; firstName?: string; lastName?: string; username?: string; photoUrl?: string;
  plan?: string; planDuration?: string; planData?: any; expire_at?: number; isTrialAvailable?: boolean; marketingConsent?: boolean; [k: string]: any;
}

interface AuthStore {
  enabled: boolean;
  ready: boolean;              // the auth state is known (and the database record read)
  checked: boolean;            // the player was asked whether it is logged in itself (then it hands its token over)
  user: DbUser | null;
  authUser: any | null;
  enable: () => void;
  waitForUser: () => Promise<DbUser | null>;
  login: (email: string, pass: string) => Promise<DbUser | null>;
  loginWithToken: (token: string) => Promise<void>;
  signup: (user: Record<string, any>) => Promise<DbUser | null>;
  logOut: () => Promise<void>;
  recoverPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  saveUserData: (user: DbUser) => Promise<void>;
  changeAvatar: (file: File, uid: string) => Promise<string>;
  deleteUser: (user: DbUser) => Promise<void>;
  getUserToken: () => Promise<any>;
  resendEmailVerification: () => Promise<void>;
  isUserFilledWithMandatory: (user?: DbUser | null) => boolean;
  isSubscribedToPlan: (user: DbUser | null) => boolean;
  hasPremium: () => boolean;
  isPremiumDevice: () => boolean;
}

const MANDATORY = ['firstName', 'lastName'];
let justFeLogged = false;
let stopUserWatch: (() => void) | null = null;
let syncTimer = 0;
let checkTimer = 0;
// the first backend check is over: signed in with the player's token, or the player isn't logged in
function markChecked(): void { window.clearTimeout(checkTimer); if (!useAuth.getState().checked) { useAuth.setState({ checked: true }); } }
// the player said it is logged in and was asked for its token: checked once that sign-in lands
function expectToken(): void { window.clearTimeout(checkTimer); checkTimer = window.setTimeout(markChecked, 8000); }

// the frame's modalService.parseErrorObject
export function errorText(e: any): string {
  if (e === null || e === undefined) { return ''; }
  if (typeof e === 'string') { return e; }
  if (e.error && typeof e.error === 'string') { return e.error; }
  if (e.data && e.data.error && e.data.error.message) { return String(e.data.error.message); }
  if (e.message) { return String(e.message); }
  try { return JSON.stringify(e); } catch { return String(e); }
}
export function showError(e: any, onClose?: () => void): void {
  useModal.getState().open('gotit', { title: 'MyVolumio Error', message: errorText(e), onClose });
}

async function dbUser(uid: string): Promise<DbUser | null> { return read('users/' + uid); }

async function createDbUser(uid: string, data: Record<string, any>): Promise<DbUser | null> {
  const f = await fb();
  const user: any = strip(data);
  user.uid = uid;
  user.createdAt = f.D.serverTimestamp();
  user.updatedAt = f.D.serverTimestamp();
  delete user.password;
  await f.D.set(f.D.ref(f.db, 'users/' + uid), user);
  return dbUser(uid);
}

async function setUserByAuth(authUser: any): Promise<DbUser | null> {
  if (stopUserWatch) { stopUserWatch(); stopUserWatch = null; }
  if (!authUser) {
    useAuth.setState({ authUser: null, user: null, ready: true });
    return null;
  }
  let user = await dbUser(authUser.uid);
  if (!user || !user.uid) {
    // not on the database yet: the record starts from what the sign-in knows
    user = await createDbUser(authUser.uid, { email: authUser.email || undefined });
  }
  useAuth.setState({ authUser, user, ready: true });
  markChecked();
  // the frame's $firebaseObject is live: the plan changes under the page after a payment
  const f = await fb();
  stopUserWatch = f.D.onValue(f.D.ref(f.db, 'users/' + authUser.uid), snap => { if (snap.exists()) { useAuth.setState({ user: snap.val() }); } });
  return user;
}

async function currentUser() {
  const f = await fb();
  if (!f.auth.currentUser) { throw new Error('You\'re not logged. Please log-in or sign-up.'); }
  return { f, cu: f.auth.currentUser };
}

async function sendUserTokenToBackend(): Promise<void> {
  if (!connected()) { return; }
  const token = await useAuth.getState().getUserToken();
  if (token === null || token === undefined) { return; }
  emit('setMyVolumioToken', { token });
}

// the frame's syncronizeWithBackend: which side is logged in decides who gets a token
async function syncWithBackend(): Promise<void> {
  if (!connected()) { markChecked(); return; }
  const st = useAuth.getState();
  if (justFeLogged) { justFeLogged = false; await sendUserTokenToBackend(); markChecked(); return; }
  const status = await ask<{ loggedIn?: boolean; uid?: string }>('getMyVolumioStatus', undefined, 'pushMyVolumioStatus', 6000);
  if (!status) { markChecked(); return; }
  if (status.loggedIn === true) {
    if (st.user === null) { emit('getMyVolumioToken'); expectToken(); }
    else if (st.user.uid !== status.uid) { await logOutFrontend(); emit('getMyVolumioToken'); expectToken(); }
    else { markChecked(); }
  } else {
    if (st.user !== null) { await sendUserTokenToBackend(); }
    markChecked();
  }
}

function scheduleSync(): void { window.clearTimeout(syncTimer); syncTimer = window.setTimeout(() => { syncWithBackend().catch(() => { /* the backend answers when it can */ }); }, 2000); }

async function logOutFrontend(): Promise<void> {
  const f = await fb();
  await setUserByAuth(null);
  await f.A.signOut(f.auth);
}

export const useAuth = create<AuthStore>((set, get) => ({
  enabled: false,
  ready: false,
  checked: false,
  user: null,
  authUser: null,

  enable: () => {
    if (get().enabled) { return; }
    set({ enabled: true });
    fb().then(f => { f.A.onAuthStateChanged(f.auth, u => { setUserByAuth(u).catch(showError); }); }).catch(e => { showError(e); set({ ready: true }); });
    on('pushMyVolumioLogout', () => { logOutFrontend().catch(() => { /* nothing to sign out of */ }); });
    on('pushMyVolumioToken', (data: any) => { if (data && data.token) { get().loginWithToken(data.token).catch(e => { markChecked(); showError(e); }); } });
    // the first check runs as soon as Firebase knows whether it kept a session (the frame waited a
    // fixed 2s, showing the Access page meanwhile); later user changes sync two seconds after, as there
    get().waitForUser().then(() => syncWithBackend()).catch(markChecked);
    let last = get().user;
    useAuth.subscribe(s => { if (s.user !== last) { last = s.user; scheduleSync(); } });
  },

  waitForUser: () => new Promise(resolve => {
    if (get().ready) { resolve(get().user); return; }
    const off = useAuth.subscribe(s => { if (s.ready) { off(); resolve(s.user); } });
  }),

  login: async (email, pass) => {
    const f = await fb();
    const cred = await f.A.signInWithEmailAndPassword(f.auth, email, pass);
    justFeLogged = true;
    return setUserByAuth(cred.user);
  },

  loginWithToken: async (token) => {
    const f = await fb();
    await f.A.signInWithCustomToken(f.auth, token);
  },

  signup: async (data) => {
    const f = await fb();
    const cred = await f.A.createUserWithEmailAndPassword(f.auth, data.email, data.password);
    let user: DbUser | null;
    try { user = await createDbUser(cred.user.uid, data); }
    catch (e) { await f.A.deleteUser(cred.user).catch(() => { /* already gone */ }); throw e; }
    f.A.sendEmailVerification(cred.user).catch(showError);
    set({ authUser: cred.user, user, ready: true });
    return user;
  },

  logOut: async () => {
    if (connected()) { emit('myVolumioLogout'); }
    await logOutFrontend();
  },

  recoverPassword: async (email) => { const f = await fb(); await f.A.sendPasswordResetEmail(f.auth, email); },
  updatePassword: async (password) => { const { f, cu } = await currentUser(); await f.A.updatePassword(cu, password); },
  updateEmail: async (email) => { const { f, cu } = await currentUser(); await f.A.updateEmail(cu, email); },

  saveUserData: async (user) => {
    const u: any = strip(user);
    delete u.password;
    await write('users/' + u.uid, u);
  },

  changeAvatar: async (file, uid) => {
    const f = await fb();
    const r = f.S.ref(f.storage, 'userAvatars/' + uid);
    await f.S.uploadBytes(r, file);
    const url = await f.S.getDownloadURL(r);
    await write('/users/' + uid + '/photoUrl', url);
    return url;
  },

  deleteUser: async (user) => {
    const { f, cu } = await currentUser();
    if (get().isSubscribedToPlan(user)) {
      const token = await get().getUserToken();
      await api.cancelSubscription(token, user.uid);
    }
    await f.A.deleteUser(cu);
  },

  getUserToken: async () => {
    try {
      const { cu } = await currentUser();
      const idToken = await cu.getIdToken(false);
      return await api.getCustomToken(idToken);
    } catch (e) { showError(e); return null; }
  },

  resendEmailVerification: async () => { const { f, cu } = await currentUser(); await f.A.sendEmailVerification(cu); },

  isUserFilledWithMandatory: (user) => {
    const u = user === undefined ? get().user : user;
    return MANDATORY.every(k => u && Object.prototype.hasOwnProperty.call(u, k) && u[k] !== undefined && String(u[k]).length > 0);
  },
  isSubscribedToPlan: (user) => !!(user && user.plan && ['virtuoso', 'superstar', 'premium'].indexOf(user.plan) > -1),
  hasPremium: () => { const u = get().user; return !!(u && u.plan && ['superstar', 'premium'].indexOf(u.plan) > -1); },
  isPremiumDevice: () => { const si = useMenu.getState().systemInfo; return !!(si && si.isPremiumDevice === true); },
}));

// the menu's MyVolumio entry enables the account and goes to the profile once the user is known
export function goToMyVolumio(nav: (p: string) => void): void {
  const go = () => nav('/myvolumio/profile');
  try { useAuth.getState().enable(); useAuth.getState().waitForUser().then(go, go); }
  catch { go(); }
}
