// Convert import/dotclear.json to one posts/*.md file per post.
//
// The Dotclear XHTML is kept as is as the body (templateEngineOverride: html
// stops Markdown from touching it), and the published comments that aren't
// listed as spam in import/comment-filter.json go in the front matter.
//
// Usage: node import/convert.mjs
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const { posts, comments, categories } = JSON.parse(readFileSync(join(import.meta.dirname, 'dotclear.json'), 'utf8'));
const filter = JSON.parse(readFileSync(join(import.meta.dirname, 'comment-filter.json'), 'utf8'));
const catUrl = Object.fromEntries(categories.map(c => [c.id, c.url]));
const hidden = new Set(filter.exclude.filter(id => !filter.keep.includes(id)));

// YAML values: JSON strings are valid YAML; multi-line HTML uses a literal block.
const str = s => JSON.stringify(s);
const block = (s, indent) =>
  /^[^\s]/.test(s) && !/\s$/.test(s) && s.includes('\n')
    ? '|-\n' + s.split('\n').map(l => l ? indent + l : '').join('\n')
    : str(s);
// "YYYY-MM-DD HH:MM:SS" local time -> YAML timestamp without timezone.
const date = dt => dt.replace(' ', 'T');

const outDir = join(root, 'posts');
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir).filter(f => f.endsWith('.md')))
  rmSync(join(outDir, f));
const names = new Set();
for (const p of posts) {
  if (p.excerpt) throw new Error(`post ${p.id} has an excerpt, which isn't supported`);
  const kept = comments.filter(c => c.post_id == p.id && !hidden.has(c.id));
  if (kept.some(c => c.trackback == 1)) throw new Error(`post ${p.id} has trackbacks`);

  const fm = [
    `title: ${str(p.title)}`,
    `date: ${date(p.dt)}`,
    p.tz != 'Europe/Paris' && `timezone: ${p.tz}`,
    p.upddt != p.dt && `updated: ${date(p.upddt)}Z`,
    `url: ${str(p.url)}`,
    `id: ${p.id}`,
    `guid: ${p.guid}`,
    p.lang && `lang: ${p.lang}`,
    p.cat_id && `category: ${str(catUrl[p.cat_id])}`,
    p.tags.length && `tags: [${p.tags.map(str).join(', ')}]`,
    p.open_comment == 1 && 'comments_open: true',
    // Feeds keep the old http:// links and GUIDs for imported posts.
    'http: true',
    'templateEngineOverride: html',
  ];
  if (kept.length) {
    fm.push('comments:');
    for (const c of kept)
      fm.push(`  - id: ${c.id}`,
              `    date: ${date(c.dt)}`,
              `    author: ${str(c.author)}`,
              ...(c.site ? [`    site: ${str(c.site)}`] : []),
              ...(c.me ? ['    me: true'] : []),
              `    content: ${block(c.content, '      ')}`);
  }

  // File name: date and ASCII version of the URL's last part.
  let name = p.dt.slice(0, 10) + '-' + p.url.slice(11).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  while (names.has(name)) name += '-';
  names.add(name);
  writeFileSync(join(outDir, name + '.md'), `---\n${fm.filter(Boolean).join('\n')}\n---\n${p.content}`);
}
console.log(`${posts.length} posts written to posts/`);
