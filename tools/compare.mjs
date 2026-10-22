// Compare the old Dotclear blog with the static site in _site/.
//
// Usage: node tools/compare.mjs [old blog URL, default http://localhost:8104]
//
// Crawls both sites (the static one is served locally, resolving URLs like
// GitHub Pages: foo -> foo.html), then checks that every URL returning 200 on
// the old blog exists in the static site, and compares content types, visible
// text (ignoring the comment form, removed spam comments...) and feed entries.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative } from 'node:path';
import { encode } from '../lib/dotclear.js';

const OLD = (process.argv[2] || 'http://localhost:8104').replace(/\/$/, '');
const root = join(import.meta.dirname, '..');
const site = join(root, '_site');

// Static server mimicking GitHub Pages.
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8', '.png': 'image/png',
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
                '.xml': 'application/xml' };
const isFile = f => existsSync(f) && statSync(f).isFile();
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = join(site, path);
  const send = (status, file) => {
    res.writeHead(status, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  };
  if (isFile(f)) return send(200, f);
  if (isFile(f + '.html')) return send(200, f + '.html');
  if (isFile(join(f, 'index.html'))) {
    if (path.endsWith('/')) return send(200, join(f, 'index.html'));
    res.writeHead(301, { Location: encodeURI(path) + '/' });
    return res.end();
  }
  send(404, join(site, '404.html'));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const NEW = `http://127.0.0.1:${server.address().port}`;

async function crawl(base, seeds) {
  const results = new Map();
  const referrers = new Map();
  const queue = [...seeds];
  const add = (href, from) => {
    try {
      const u = new URL(href.replace(/&amp;/g, '&'), base + from);
      if (u.origin != base || u.search) return;
      // Normalize the percent-encoding, so that both sites use the same keys.
      const path = encode(decodeURIComponent(u.pathname));
      if (!referrers.has(path)) referrers.set(path, from);
      if (!results.has(path) && !queue.includes(path)) queue.push(path);
    } catch {}
  };
  while (queue.length) {
    const batch = queue.splice(0, 8).filter(p => !results.has(p));
    await Promise.all(batch.map(async path => {
      results.set(path, null);
      const res = await fetch(base + path, { redirect: 'manual' });
      const type = (res.headers.get('content-type') || '').split(';')[0];
      const body = Buffer.from(await res.arrayBuffer());
      results.set(path, { status: res.status, type, body, location: res.headers.get('location'),
                          get from() { return referrers.get(path); } });
      if (res.headers.get('location')) add(res.headers.get('location'), path);
      if (res.status == 200 && /html|xml|octet/.test(type)) {
        const text = body.toString('utf8');
        for (const m of text.matchAll(/(?:href|src)="([^"]+)"/g)) add(m[1], path);
        for (const m of text.matchAll(/<(?:link|guid|id)[^>]*>(https?:[^<]+)</g))
          add(m[1].replace(/^https?:\/\/blog\.queze\.net/, base), path);
      }
    }));
  }
  return results;
}

// Seed both crawls with every page of the static site, the comment feeds the
// old blog had, and a few URLs nothing links to anymore.
const seeds = ['/rsd', '/feed/rss2/xslt'];
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
for (const file of walk(site)) {
  const path = '/' + relative(site, file).replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
  seeds.push(path);
  if (/^\/feed\/.*\/(rss2|atom)$/.test(path))
    seeds.push(path + '/comments');
  const id = path.startsWith('/post/') && readFileSync(file, 'utf8').match(/<div id="p(\d+)" class="post">/);
  if (id) seeds.push(`/feed/rss2/comments/${id[1]}`, `/feed/atom/comments/${id[1]}`);
}
const normSeeds = seeds.map(s => encode(s));

console.log(`Crawling ${OLD} and ${NEW} (_site/)...`);
const oldSite = await crawl(OLD, normSeeds);
// Also check the old URLs that nothing links to in the static site (e.g. unused scripts).
const newSite = await crawl(NEW, [...normSeeds,
  ...[...oldSite].filter(([, r]) => r.status == 200).map(([p]) => p)]);
server.close();

// Visible text of an HTML page, without the parts that intentionally went away.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«',
                   raquo: '»', rsaquo: '›', hellip: '…' };
// Comments missing from the static page (spam) are removed from the old one.
function visibleText(html, newHtml) {
  if (newHtml) {
    html = html
      .replace(/<form[^>]*id="comment-form"[\s\S]*?<\/form>/, '')
      .replace(/<p id="ping-url">[\s\S]*?<\/p>/, '')
      .replace(/<div id="pings">[\s\S]*?<\/div>/, '')
      .replace(/(- )?<a href="[^"]*#pings"[^>]*>[^<]*<\/a>/g, '')
      .replace(/<p id="comments-feed">[\s\S]*?<\/p>/, '')
      .replace(/-\s*<a[^>]*\/comments"[^>]*>Comments feed<\/a>/g, '')
      .replace(/<li><a[^>]*\/comments"[^>]*>Comments feed<\/a><\/li>/g, '')
      .replace(/<dt id="(c\d+)"[\s\S]*?<\/dd>/g, (m, id) => newHtml.includes(`id="${id}"`) ? m : '');
  }
  return html
    .replace(/<head>[\s\S]*?<\/head>/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<div id="search">[\s\S]*?<\/div>/, '')
    .replace(/<div id="footer">[\s\S]*?<\/div>/, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
      e[0] != '#' ? ENTITIES[e] ?? m
                  : String.fromCodePoint(e[1] == 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)))
    .split(/\s+/).filter(Boolean);
}
// Short description of the differences between two word lists.
function wordDiff(a, b) {
  let start = 0, end = 0;
  while (start < a.length && a[start] == b[start]) start++;
  while (end < a.length - start && end < b.length - start &&
         a[a.length - 1 - end] == b[b.length - 1 - end]) end++;
  const cut = words => (words.length > 30 ? [...words.slice(0, 30), '…'] : words).join(' ');
  return `old: "${cut(a.slice(start, a.length - end))}"\n      new: "${cut(b.slice(start, b.length - end))}"`;
}
// Feed entries: [id, link, title], with absolute URLs on the real host.
const feedEntries = xml => [...xml.matchAll(/<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g)].map(([, e]) => [
  (e.match(/<(?:guid[^>]*|id)>([^<]*)</) || [])[1],
  (e.match(/<link>([^<]*)<|<link href="([^"]*)"/) || []).slice(1).join(''),
  (e.match(/<title>([^<]*)</) || [])[1],
].join(' ').replace(OLD, 'http://blog.queze.net'));

const ok = [...oldSite].filter(([, r]) => r.status == 200);
const missing = [], typeDiffs = new Map(), textDiffs = [], identical = [];
for (const [path, old] of ok) {
  const cur = newSite.get(path);
  if (!cur || cur.status != 200) {
    missing.push(`${path} (${cur ? cur.status + (cur.location ? ' -> ' + cur.location : '') : 'not crawled'})`);
    continue;
  }
  if (old.type != cur.type) {
    const key = `${old.type} -> ${cur.type}`;
    typeDiffs.set(key, [...(typeDiffs.get(key) || []), path]);
  }
  let diff = null;
  if (old.type == 'text/html') {
    const newHtml = cur.body.toString('utf8');
    const a = visibleText(old.body.toString('utf8'), newHtml), b = visibleText(newHtml);
    if (a.join(' ') != b.join(' ')) diff = wordDiff(a, b);
  } else if (/xml/.test(old.type)) {
    const a = feedEntries(old.body.toString('utf8')), b = feedEntries(cur.body.toString('utf8'));
    if (a.join('\n') != b.join('\n')) diff = wordDiff(a, b);
  } else if (createHash('sha1').update(old.body).digest('hex') !=
             createHash('sha1').update(cur.body).digest('hex')) {
    diff = 'binary content differs';
  }
  if (diff) textDiffs.push(`${decodeURI(path)}\n      ${diff}`);
  else identical.push(path);
}

const extra = [...newSite].filter(([p, r]) => r.status == 200 && oldSite.get(p)?.status != 200);
// Links that were already broken on the old blog (e.g. relative links in posts) aren't listed.
const broken = [...newSite].filter(([p, r]) => r.status == 404 && r.from &&
                                               oldSite.get(p)?.status == 200);
// Comment feeds can't exist: /feed/atom is a file, so /feed/atom/comments can't be.
const commentFeeds = missing.filter(m => /^\/feed\/.*\/comments\b/.test(m));
const list = (title, items) => {
  console.log(`\n${title}: ${items.length}`);
  for (const i of items) console.log('  ' + i);
};
console.log(`\nOld blog: ${oldSite.size} URLs crawled, ${ok.length} returned 200.`);
console.log(`Static site: ${ok.length - missing.length} of them present, ${identical.length} with identical content.`);
console.log(`\nOld URLs missing from the static site: ${missing.length}, including ` +
            `${commentFeeds.length} comment feeds`);
for (const m of missing.filter(m => !commentFeeds.includes(m))) console.log('  ' + m);
console.log(`\nContent type changes:`);
for (const [key, paths] of typeDiffs) console.log(`  ${key}: ${paths.length} (e.g. ${decodeURI(paths[0])})`);
list('Content differences (visible text for HTML, entries for feeds)', textDiffs);
list('Static URLs that did not exist on the old blog', extra.map(([p]) => decodeURI(p)));
list('Broken links in the static site (not broken on the old blog)', broken.map(([p, r]) => `${decodeURI(p)} (linked from ${decodeURI(r.from)})`));
