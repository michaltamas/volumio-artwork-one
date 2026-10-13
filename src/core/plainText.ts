/**
 * Text a plugin dressed as HTML, as plain text. Some plugins (Bandcamp, Mixcloud, …) send list
 * and item titles as markup — coloured <span>s, icons, layout <div>s — for Volumio's Angular
 * interfaces, which write them into the page as HTML. This interface shows text, so the tags go
 * and the entities are decoded, as Nova does: "<span style='color: #7…'>Album</span>" → "Album".
 * The markup is parsed in an inert document (nothing in it loads or runs); each tag becomes a space.
 */
const MARKUP = /<\/?[a-z][^>]*>|&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i;

export function plainText<T>(v: T): T {
  if (typeof v !== 'string' || !MARKUP.test(v)) { return v; }
  try {
    // every tag stands for a gap (the plugins space their pieces with margins in the style): "<span…>ALBUM</span>Name" → "ALBUM Name"
    const spaced = v.replace(/<\/?[a-z][^>]*>/gi, ' $& ');
    const text = new DOMParser().parseFromString(spaced, 'text/html').body.textContent || '';
    return text.replace(/\s+/g, ' ').trim() as unknown as T;
  } catch { return v; }
}

const FIELDS = ['title', 'name', 'artist', 'album'] as const;

/** The same for a browse answer: list titles, item titles, names, artists and albums, and the page's info. */
export function plainLists<L extends { title?: any; items?: any[] }>(lists: L[]): L[] {
  return lists.map(l => {
    if (!l || typeof l !== 'object') { return l; }
    const items = Array.isArray(l.items) ? l.items.map(plainItem) : l.items;
    return { ...l, title: plainText(l.title), items };
  });
}
export function plainItem<I>(it: I): I {
  if (!it || typeof it !== 'object') { return it; }
  const o: any = it; let out: any = null;
  FIELDS.forEach(f => { const v = plainText(o[f]); if (v !== o[f]) { out = out || { ...o }; out[f] = v; } });
  return out || it;
}
