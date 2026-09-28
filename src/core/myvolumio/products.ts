/**
 * MyVolumio's plans (the frame's productsService): the newest product set at or before this
 * UI's version key, the feature lists the frame adds, prices localised through Paddle.
 */
import { create } from 'zustand';
import { fb } from './firebase';
import { paddlePrices } from './paddle';

export const VERSION = '002001';
export const MONTHLY_PLAN = 'monthly', YEARLY_PLAN = 'yearly', LIFETIME_PLAN = 'lifetime';
export const SHOW_SAVING_MESSAGE = true;

export interface Price { paddleId?: number; amount?: number; localizedPrice?: string; trial?: { trialEnabled?: boolean; trialDays?: number; trialDaysAuth?: string; trialAuth?: string }; [k: string]: any }
export interface Product { plan: string; name: string; planCode?: string; maxDevices?: number; features?: string[]; prices?: Record<string, Price>; [k: string]: any }
export type Products = Record<string, Product>;

// MYVOLUMIO_PLANS.* as the English strings
export const FEATURE: Record<string, string> = {
  FILES_PLAYBACK: 'Playback of all filetypes', WEBRADIOS_DIRECTORY: 'Integrated Webradios Directories', ALARM_AND_SLEEP_FUNCTION: 'Alarm and sleep function', PLUGINS_STORE: 'Plugins store',
  DLNA_UPNP_BROWSING: 'DLNA UPNP Browsing', AIRPLAY_PLAYBACK: 'Airplay Playback', UPNP_RENDERER_PLAYBACK: 'UPNP Renderer Playback', CONTEMPORARY_UI: 'Web User Interface', IOS_ANDROID_APP: 'iOS and Android Apps',
  NETWORK_STORAGE_SUPPORT: 'Network Storage Browsing', OVER_THE_AIR_UPDATES: 'Over The Air Updates', ALL_FREE_FEATURES: 'All Free Features', MYVOLUMIO_6_DEVICES: 'Use MyVolumio on up to 6 devices',
  AUTO_SYNC: 'Automatic Sync of Personal items', REMOTE_CONNECTION_6_DEVICES: 'Remote connection to up to 6 devices', NATIVE_TIDAL_QOBUZ_INTEGRATION: 'Native TIDAL, TIDAL Connect and Qobuz Integration',
  CD_PLAYBACK_RIPPING: 'CD Playback and Ripping', BLUETOOTH_INPUT: 'Bluetooth Audio Playback Input', HIRESAUDIO_INTEGRATION: 'Highresaudio.com Integration', INPUT_PLAYBACK: 'Digital and Analog Inputs Playback',
  MUSIC_METADATA: 'Music and Artists Credit Discovery', MULTIROOM_PLAYBACK: 'Multiroom Playback', MANIFEST_UI: 'Manifest UI',
};
export const featureText = (key: string) => FEATURE[key.replace(/^MYVOLUMIO_PLANS\./, '')] || key;

const FREE_FEATURES = ['FILES_PLAYBACK', 'WEBRADIOS_DIRECTORY', 'ALARM_AND_SLEEP_FUNCTION', 'PLUGINS_STORE', 'DLNA_UPNP_BROWSING', 'AIRPLAY_PLAYBACK', 'UPNP_RENDERER_PLAYBACK', 'CONTEMPORARY_UI', 'IOS_ANDROID_APP', 'NETWORK_STORAGE_SUPPORT', 'OVER_THE_AIR_UPDATES', 'EMPTY'].map(k => k === 'EMPTY' ? k : 'MYVOLUMIO_PLANS.' + k);
const PREMIUM_FEATURES = ['ALL_FREE_FEATURES', 'MYVOLUMIO_6_DEVICES', 'AUTO_SYNC', 'REMOTE_CONNECTION_6_DEVICES', 'NATIVE_TIDAL_QOBUZ_INTEGRATION', 'CD_PLAYBACK_RIPPING', 'BLUETOOTH_INPUT', 'HIRESAUDIO_INTEGRATION', 'INPUT_PLAYBACK', 'MUSIC_METADATA', 'MULTIROOM_PLAYBACK', 'MANIFEST_UI'].map(k => 'MYVOLUMIO_PLANS.' + k);

interface ProductsStore {
  products: Products | null;
  loading: Promise<Products> | null;
  trialOverride: boolean;
  load: () => Promise<Products>;
  byCode: (code: string) => Promise<Product | undefined>;
  forUser: (user: any) => Promise<Product | undefined>;
  setTrialOverride: (v: boolean) => void;
}

export const useProducts = create<ProductsStore>((set, get) => ({
  products: null,
  loading: null,
  trialOverride: false,
  load: () => {
    const s = get();
    if (s.products) { return Promise.resolve(s.products); }
    if (s.loading) { return s.loading; }
    const p = (async () => {
      const f = await fb();
      const snap = await f.D.get(f.D.query(f.D.ref(f.db, 'products'), f.D.orderByKey(), f.D.endAt(VERSION), f.D.limitToLast(1)));
      const payload = snap.val() || {};
      const products: Products = payload[Object.keys(payload)[0]] || {};
      if (products.free) { products.free.features = FREE_FEATURES; }
      if (products.premium) { products.premium.features = PREMIUM_FEATURES; }
      const prem = products.premium;
      if (prem && prem.prices) {
        await Promise.all(Object.keys(prem.prices).map(async duration => {
          const price = prem.prices![duration];
          if (!price || !price.paddleId) { return; }
          try {
            const prices = await paddlePrices(price.paddleId);
            const raw = String(prices.recurring.price.gross);
            const numeric = Number(raw.replace(/[^0-9.]+/g, ''));
            price.localizedPrice = numeric + ' ' + raw.replace(String(numeric), '');
          } catch { /* the card shows what it has */ }
        }));
      }
      set({ products, loading: null });
      return products;
    })();
    p.catch(() => set({ loading: null }));
    set({ loading: p });
    return p;
  },
  byCode: (code) => get().load().then(p => p[code]),
  forUser: (user) => get().byCode((user && user.plan) || 'free'),
  setTrialOverride: (v) => set({ trialOverride: v }),
}));

export function roundToTwo(num: number): string {
  const m = num.toString().match(/^-?\d+(?:\.\d{0,2})?/);
  return (m ? m[0] : String(num)).replace('.00', '');
}
export function monthlyFromYearly(yearly: string): string {
  const n = Number(yearly.split(' ')[0]), cur = (yearly.split(' ')[1] || '').replace('.00', '');
  return roundToTwo(n / 12) + ' ' + cur;
}
export function yearlyFromMonthly(monthly: string): string {
  const n = Number(monthly.split(' ')[0]), cur = monthly.split(' ')[1] || '';
  return roundToTwo(n * 12) + ' ' + cur;
}
export function yearlySaving(monthly: string, yearly: string): string {
  const m = Number(monthly.split(' ')[0]), y = Number(yearly.split(' ')[0]), cur = monthly.split(' ')[1] || '';
  return roundToTwo(m * 12 - y) + ' ' + cur;
}
