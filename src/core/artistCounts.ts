/**
 * How many albums and tracks an artist has, for the Artists page: "7 albums" under a grid tile,
 * "7 albums · 64 tracks" under a list row. Volumio's artist list carries names and portraits
 * only; the counts are on the artist's own page, where the albums are the folder entries and the
 * tracks the songs. Asked once per artist over REST as tiles / rows scroll into view; forgotten
 * when the collection's totals change.
 */
import { useEffect, type RefObject } from 'react';
import { rest } from './api';

export interface ArtistCounts { albums: number; tracks: number }

let counts: Record<string, Promise<ArtistCounts | null> | ArtistCounts> = {};
let stamp = '';

export async function refreshCounts(): Promise<void> {
  const s = (await rest<any>('collectionstats')) || {};
  const next = [s.artists, s.albums, s.songs].join('/');
  if (next !== stamp) { stamp = next; counts = {}; }
}

export function countArtist(uri: string): Promise<ArtistCounts | null> {
  if (!uri) { return Promise.resolve(null); }
  const c = counts[uri];
  if (c !== undefined) { return Promise.resolve(c); }
  const p = rest<any>('browse', { uri }).then(j => {
    const lists = (j && j.navigation && j.navigation.lists) || [];
    const n: ArtistCounts = { albums: 0, tracks: 0 };
    lists.forEach((l: any) => (l.items || []).forEach((it: any) => {
      if (it && it.type === 'folder') { n.albums++; } else if (it && it.type === 'song') { n.tracks++; }
    }));
    counts[uri] = n;
    return n;
  }).catch(() => { delete counts[uri]; return null; });
  counts[uri] = p;
  return p;
}

const plural = (n: number, one: string) => n + ' ' + one + (n === 1 ? '' : 's');

// "7 albums" (the grid tile)
export function countText(c: ArtistCounts | null | undefined): string { return c ? plural(c.albums, 'album') : ''; }

// "7 albums · 64 tracks" (the list row)
export function countsText(c: ArtistCounts | null | undefined): string {
  if (!c) { return ''; }
  return [c.albums ? plural(c.albums, 'album') : '', c.tracks ? plural(c.tracks, 'track') : ''].filter(Boolean).join(' · ');
}

/** Fetches an artists:// item's counts once its element nears the viewport, and hands them to onCounts. */
export function useArtistCounts(ref: RefObject<HTMLElement | null>, uri: string | undefined, enabled: boolean, onCounts: (c: ArtistCounts) => void): void {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || !/^artists:\/\//.test(String(uri || '')) || !('IntersectionObserver' in window)) { return; }
    let alive = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) { return; }
        io.unobserve(en.target);
        countArtist(String(uri)).then(c => { if (alive && c) { onCounts(c); } });
      });
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => { alive = false; io.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, enabled]);
}
