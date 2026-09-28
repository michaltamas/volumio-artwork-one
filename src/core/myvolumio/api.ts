/** MyVolumio's cloud functions (the frame's firebaseApiFunctionsService): every call carries its arguments in the query string. */
const API = 'https://functions.volumio.cloud';

async function call(path: string, method: 'GET' | 'POST', params: Record<string, any>): Promise<any> {
  const q = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k]))).join('&');
  const r = await fetch(API + path + (q ? '?' + q : ''), { method });
  const text = await r.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* a bare token */ }
  if (!r.ok) { const err: any = new Error(String((data && data.error && data.error.message) || r.statusText || 'request failed')); err.data = data; err.status = r.status; throw err; }
  return data;
}

export const getCustomToken = (idToken: string) => call('/api/v1/getCustomToken', 'GET', { idToken });
export const enableDevice = (token: any, uid: string, hwuuid: string) => call('/api/v1/enableMyVolumioDevice', 'POST', { token, uid, hwuuid });
export const disableDevice = (token: any, uid: string, hwuuid: string) => call('/api/v1/disableMyVolumioDevice', 'POST', { token, uid, hwuuid });
export const deleteDevice = (token: any, uid: string, hwuuid: string) => call('/api/v1/deleteMyVolumioDevice', 'POST', { token, uid, hwuuid });
export const cancelSubscription = (token: any, uid: string) => call('/api/v1/cancelSubscription', 'POST', { token, uid });
export const updateSubscription = (token: any, uid: string, newPlan: any, planDuration: string) => call('/api/v1/updateSubscription', 'POST', { token, uid, newPlan, planDuration });
export const getSubscriptionCancelUrl = (token: any, uid: string) => call('/api/v1/getSubscriptionCancelUrl', 'POST', { token, uid });
