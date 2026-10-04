/**
 * Search inside the player's own playlists. Volumio's search looks at the library and the services,
 * never at playlists; their contents are small, so the theme reads them over REST (once, kept until
 * the playlists change) and matches the query against title, artist and album. The matches become
 * one more list, "Playlists", among the search results — each row a song from the playlist it was
 * found in, playable as any other.
 */
import { rest } from './api';
import { on } from './socket';
import type { BrowseItem } from './store/browse';

interface Cached { name: string; items: BrowseItem[] }
let cache: Cached[] | null = null;
let loading: Promise<Cached[]> | null = null;

async function load(): Promise<Cached[]> {
  if (cache) { return cache; }
  if (loading) { return loading; }
  loading = (async () => {
    const root = await rest<any>('browse', { uri: 'playlists' });
    const names: string[] = ((root && root.navigation && root.navigation.lists) || []).flatMap((l: any) => (l.items || [])).filter((i: any) => i && i.type === 'playlist').map((i: any) => String(i.title || i.name || ''));
    const out: Cached[] = await Promise.all(names.map(async (name) => {
      const r = await rest<any>('browse', { uri: 'playlists/' + name });
      const items: BrowseItem[] = ((r && r.navigation && r.navigation.lists) || []).flatMap((l: any) => (l.items || [])).filter((i: any) => i && i.type === 'song');
      return { name, items };
    }));
    cache = out; loading = null;
    return out;
  })();
  return loading;
}

const fold = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The playlist songs matching `query`, as a browse list; null when there are none. */
export async function searchPlaylists(query: string): Promise<{ title: string; availableListViews: string[]; items: BrowseItem[] } | null> {
  const q = fold(query).trim(); if (q.length < 2) { return null; }
  const lists = await load();
  const items: BrowseItem[] = [];
  const seen = new Set<string>();
  lists.forEach((pl) => pl.items.forEach((it) => {
    if (!(fold(it.title).includes(q) || fold(it.artist).includes(q) || fold(it.album).includes(q))) { return; }
    const key = String(it.uri || '') + '|' + pl.name; if (seen.has(key)) { return; } seen.add(key);
    items.push({ ...it, album: it.album ? `${it.album} · in ${pl.name}` : `in ${pl.name}`, playlistName: pl.name } as BrowseItem);
  }));
  return items.length ? { title: 'Playlists', availableListViews: ['list'], items: items.slice(0, 50) } : null;
}

// the cache goes when a playlist changes (the player says so on every add / remove / delete)
['pushListPlaylist', 'pushCreatePlaylist', 'pushDeletePlaylist', 'pushAddToPlaylist', 'pushRemoveFromPlaylist', 'pushPlaylistIndex'].forEach(ev => on(ev, () => { cache = null; }));
