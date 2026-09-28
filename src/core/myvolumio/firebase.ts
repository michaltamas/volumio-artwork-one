/**
 * MyVolumio's Firebase, loaded only once MyVolumio is enabled (the frame's angularfire
 * service with the same project). The SDK stays out of the main bundle.
 */
export interface Fb {
  auth: import('firebase/auth').Auth;
  db: import('firebase/database').Database;
  storage: import('firebase/storage').FirebaseStorage;
  A: typeof import('firebase/auth');
  D: typeof import('firebase/database');
  S: typeof import('firebase/storage');
}

const CONFIG = {
  apiKey: 'AIzaSyDzEZmwJZS4KZtG9pEXOxlm1XcZikP0KbA',
  authDomain: 'myvolumio.firebaseapp.com',
  databaseURL: 'https://myvolumio.firebaseio.com',
  projectId: 'myvolumio',
  storageBucket: 'myvolumio.appspot.com',
  messagingSenderId: '560540102538',
};

let loading: Promise<Fb> | null = null;

export function fb(): Promise<Fb> {
  if (!loading) {
    loading = Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database'), import('firebase/storage')]).then(([app, A, D, S]) => {
      const a = app.getApps().length ? app.getApp() : app.initializeApp(CONFIG);
      return { auth: A.getAuth(a), db: D.getDatabase(a), storage: S.getStorage(a), A, D, S };
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
}

// the frame's angularfire object: `$value === null` when the node is missing
export async function read(path: string): Promise<any> {
  const f = await fb();
  const snap = await f.D.get(f.D.ref(f.db, path));
  return snap.exists() ? snap.val() : null;
}

export async function write(path: string, value: any): Promise<void> {
  const f = await fb();
  await f.D.set(f.D.ref(f.db, path), strip(value));
}

// keys the frame's $firebaseObject carried, never written back
export function strip<T extends Record<string, any>>(o: T): T {
  const out: any = {};
  Object.keys(o || {}).forEach(k => { if (k.indexOf('$') !== 0 && k !== 'forEach' && k !== 'listeners' && typeof o[k] !== 'function') { out[k] = o[k]; } });
  return out;
}
