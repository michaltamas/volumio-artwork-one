// Builds the Credits page (Settings → System → Credits and Open Source licenses) the way Volumio's own
// interfaces carry it: Volumio's page, kept word for word (its contributors, licenses, disclaimer and the
// GPL written offer — credits/volumio-credits.html, taken from Volumio's interface), with this interface's
// own part added before "License": Artwork One and the open-source packages it ships, read from node_modules.
// Run: node scripts/credits.mjs   (again whenever a dependency changes)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const repoUrl = (r) => { const u = typeof r === 'string' ? r : (r && r.url) || ''; return u.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/\.git$/, ''); };

// what the interface ships to the browser (sass only builds the styles)
const shipped = Object.keys(pkg.dependencies || {}).filter((n) => n !== 'sass').sort();
const rows = shipped.map((name) => {
  const f = join(root, 'node_modules', name, 'package.json');
  if (!existsSync(f)) { throw new Error('not installed: ' + name); }
  const p = JSON.parse(readFileSync(f, 'utf8'));
  const author = typeof p.author === 'string' ? p.author.replace(/\s*<.*?>|\s*\(.*?\)/g, '') : (p.author && p.author.name) || 'N/A';
  const url = repoUrl(p.repository) || p.homepage || '';
  return `${esc(name)} ${esc(p.version)} by ${esc(author)} - ${esc(p.license || 'N/A')}${url ? ` - <a href="${esc(url)}" target="_blank">${esc(url)}</a>` : ''}<br>`;
}).join('\n');

const ours = `<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">Artwork One</h3></div><div class="panel-body"><p>This interface: <b>Artwork One</b> by Michal Tamas - MIT - <a href="https://github.com/michaltamas/volumio-artwork-one" target="_blank">https://github.com/michaltamas/volumio-artwork-one</a></p><p>Open-source packages it uses:<br>
${rows}</p></div></div>`;

let html = readFileSync(join(root, 'credits/volumio-credits.html'), 'utf8');
// Volumio's files, as this interface ships them (and absolute, as the page lives under /static-page/)
html = html.replace(/(["'])app\/themes\/volumio3\//g, '$1/app/themes/artwork/').replace(/(["'])app\/assets-common\//g, '$1/app/assets-common/');
const at = html.search(/<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">(<i[^>]*><\/i>)?\s*License</);
if (at < 0) { throw new Error('the License section of Volumio\'s credits page was not found'); }
html = html.slice(0, at) + ours + html.slice(at);
const out = join(root, 'public/app/themes/artwork/assets/static-pages/credits.html');
writeFileSync(out, html);
console.log('credits:', out.replace(root, ''), '-', shipped.length, 'packages:', shipped.join(', '));
