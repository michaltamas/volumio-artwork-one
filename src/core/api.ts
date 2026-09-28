import { HOST } from './socket';

// the cover's address: the player's, unless the state already carries a full URL
export function albumart(path?: string | null): string {
  if (!path) { return ''; }
  if (path.indexOf('http') > -1) { return path; }
  return HOST + path;
}

// the REST API on the player (CORS is open on it)
export async function rest<T = any>(path: string, params?: Record<string, string>): Promise<T | null> {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  try {
    const r = await fetch(HOST + '/api/v1/' + path + q);
    if (!r.ok) { return null; }
    return (await r.json()) as T;
  } catch {
    return null;
  }
}
