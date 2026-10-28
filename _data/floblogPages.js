// Redirect pages for the URLs of the older www.queze.net blog ("floblog"),
// which old links also use on blog.queze.net (e.g. /cat10.html, /a29-….html).
// floblogRedirects.json is the mapping of the www.queze.net repository
// (_data/redirects.json there). Same URL forms as there, written as foo.html,
// which GitHub Pages also serves for /foo.
import { readFileSync } from 'node:fs';

const map = JSON.parse(readFileSync(new URL('floblogRedirects.json', import.meta.url), 'utf8'));
const local = url => url.replace(/^https:\/\/blog\.queze\.net(?=\/)/, '');
const pages = [];
const add = (names, to, title) => {
  for (const name of names) pages.push({ path: `/${name}.html`, to: local(to), title });
};
const withSlugs = (base, slugs) => [base, ...new Set(slugs)].map((s, i) => i ? `${base}-${s}` : s);

for (const p of map.posts)
  for (const prefix of ['c', 'com', 'comm', 'a', 'acc', 'n', 'nocom', 'nocomm'])
    add(withSlugs(prefix + p.id, p.slugs), p.to, p.title);
for (const c of map.categories)
  for (const prefix of ['t', 'cat'])
    for (let page = 0; page <= c.pages; page++)
      add(withSlugs(prefix + c.id + (page ? '.' + page : ''), [c.slug]), c.to, c.name);
for (let n = 1; n <= map.homePages; n++)
  add([`page${n}`], '/', 'Florian Quèze');

export default pages;
