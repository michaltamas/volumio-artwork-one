/**
 * Release notes the player sends as HTML (the system update's "FIXES / NEW ADDITIONS"), made safe
 * to write into the page: the markup is parsed in an inert document and only paragraphs, lists,
 * emphasis, line breaks and web links survive, with no attributes but a link's address. A copy
 * that arrived with its tags escaped (&lt;p&gt;, as 4.245's notes did) is decoded first, once.
 */
const KEEP: Record<string, string> = { p: 'p', ul: 'ul', ol: 'ol', li: 'li', b: 'strong', strong: 'strong', i: 'em', em: 'em', br: 'br', a: 'a', h1: 'p', h2: 'p', h3: 'p', h4: 'p', h5: 'p', h6: 'p', div: 'p' };

export function notesHtml(raw: any): string {
  let s = String(raw || '');
  if (!s) { return ''; }
  try {
    const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;
    if (s.indexOf('<') < 0 && /&lt;[a-z/]/i.test(s)) { s = parse(s).textContent || ''; }   // escaped once on the way: the tags back
    const out = document.implementation.createHTMLDocument('').body;
    const copy = (from: Node, to: Node) => {
      from.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) { to.appendChild(document.createTextNode(n.textContent || '')); return; }
        if (n.nodeType !== Node.ELEMENT_NODE) { return; }
        const el = n as Element; const name = el.tagName.toLowerCase(); const tag = KEEP[name];
        if (name === 'script' || name === 'style' || name === 'template' || name === 'iframe') { return; }   // code and frames go with their contents
        if (!tag) { copy(el, to); return; }   // an unknown tag: its text stays, the tag goes
        const e = out.ownerDocument.createElement(tag);
        if (tag === 'a') { const href = el.getAttribute('href') || ''; if (/^https?:\/\//i.test(href)) { e.setAttribute('href', href); e.setAttribute('target', '_blank'); e.setAttribute('rel', 'noopener'); } }
        copy(el, e); to.appendChild(e);
      });
    };
    copy(parse(s), out);
    return out.innerHTML;
  } catch { return s.replace(/<[^>]*>/g, ''); }
}
