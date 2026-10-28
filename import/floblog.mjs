// Import the posts of the older www.queze.net blog ("floblog") that were never
// imported into Dotclear, as unlisted posts in unlisted categories.
//
// Usage: MYSQL="mysql --defaults-file=... -uroot floblog" \
//          node import/floblog.mjs /path/to/old/queze.net [review.html]
//
// Writes posts/*.md (only for these posts, other posts are left alone), copies
// their photos to pict/www/ and their smileys to smileys/. Validated comments
// go through the same spam heuristics as the Dotclear ones; overrides are in
// import/floblog-comment-filter.json.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spamCheck, text } from './spam.mjs';

const oldSite = process.argv[2];
if (!process.env.MYSQL || !oldSite) {
  console.error('Usage: MYSQL="mysql [options] floblog" node import/floblog.mjs <old site dir> [review.html]');
  process.exit(1);
}
const root = join(import.meta.dirname, '..');

function query(sql) {
  const [cmd, ...args] = process.env.MYSQL.split(/\s+/);
  const out = execFileSync(cmd, [...args, '--default-character-set=utf8mb4', '-N', '-B', '-r', '-e', sql],
                           { encoding: 'utf8', maxBuffer: 1 << 30 });
  return JSON.parse(out.trim() || 'null') || [];
}

const posts = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.Id, 'cat', p.IdCat, 'title', p.Titre,
  'message', p.message, 'date', DATE_FORMAT(p.Date, '%Y-%m-%d'), 'time', TIME_FORMAT(p.Heure, '%H:%i:%s'),
  'author', u.Pseudo, 'photo', c.photo))
  FROM posts p JOIN cat c ON c.id = p.IdCat JOIN userlist u ON u.Id = p.IdUser
  WHERE c.prive = 0 AND p.Titre <> ''`).sort((a, b) => a.id - b.id);
const cats = Object.fromEntries(query(`SELECT JSON_ARRAYAGG(JSON_OBJECT('id', id, 'name', nom,
  'desc', \`desc\`)) FROM cat`).map(c => [c.id, c]));
// Validated comments have valid >= 1 (the ID of the validating user).
const comments = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT('id', c.Id, 'post', c.IdPost,
  'author', c.pseudo, 'message', c.Message, 'date', DATE_FORMAT(c.Date, '%Y-%m-%d'),
  'time', TIME_FORMAT(c.Heure, '%H:%i:%s'),
  'me', c.email IS NOT NULL AND c.email = (SELECT email FROM userlist WHERE Pseudo = 'florian')))
  FROM comm c WHERE c.valid >= 1`).sort((a, b) => a.id - b.id);

// Posts already imported into Dotclear: same normalized title, or same day and
// a similar title (as in the log analysis).
const decode = s => s.replace(/&(#\d+|[a-z]+);/gi, (m, e) => e[0] == '#' ? String.fromCodePoint(+e.slice(1))
  : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', egrave: 'è', eacute: 'é' })[e] ?? m);
const norm = t => decode(t).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
function similarity(a, b) {  // Ratcliff/Obershelp, like Python's difflib.
  const match = (a, b) => {
    let best = [0, 0, 0];
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++) {
        let k = 0;
        while (a[i + k] && a[i + k] == b[j + k]) k++;
        if (k > best[2]) best = [i, j, k];
      }
    const [i, j, k] = best;
    return k && k + match(a.slice(0, i), b.slice(0, j)) + match(a.slice(i + k), b.slice(j + k));
  };
  return a.length + b.length ? 2 * match(a, b) / (a.length + b.length) : 0;
}
const dotclear = JSON.parse(readFileSync(join(import.meta.dirname, 'dotclear.json'), 'utf8')).posts;
const imported = p => dotclear.some(d => norm(d.title) == norm(p.title)) ||
  dotclear.some(d => d.dt.slice(0, 10) == p.date && similarity(norm(d.title), norm(p.title)) > 0.6);

// floblog's smile(): smileys, and non-breaking spaces before ! ? :
const smileys = {};
const theme = readFileSync(join(oldSite, 'smileys/theme'), 'utf8').split('\n');
const php = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
for (const line of theme.slice(theme.findIndex(l => /\[[a-z]+\]$/i.test(l.trim())) + 1)) {
  if (!line.trim()) break;
  const [file, ...codes] = line.trim().split(/\t+/);
  for (const code of codes)
    smileys[code] = `<img src="/smileys/${php(file.replace('! ', ''))}" alt="${php(code)}" />`;
}
const strtr = (s, map) => {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  return s.replace(new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'),
                   m => map[m]);
};
const smile = s => strtr(strtr(s, smileys), { ' !': '&nbsp;!', ' ?': '&nbsp;?', ' :': '&nbsp;:' });

const slug = s => decode(s).replace(/<[^>]*>/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
const str = s => JSON.stringify(s);
const block = (s, indent) => /^[^\s]/.test(s) && !/\s$/.test(s) && s.includes('\n')
  ? '|-\n' + s.split('\n').map(l => l ? indent + l : '').join('\n') : str(s);

const filterFile = join(import.meta.dirname, 'floblog-comment-filter.json');
const filter = existsSync(filterFile) ? JSON.parse(readFileSync(filterFile, 'utf8')) : { exclude: [], keep: [] };
const exclude = new Set(filter.exclude), keep = new Set(filter.keep);
const reviewed = [];
const usedSmileys = new Set();
mkdirSync(join(root, 'pict/www'), { recursive: true });

const todo = posts.filter(p => !imported(p));
for (const p of todo) {
  const title = decode(p.title.replace(/<[^>]*>/g, ''));
  let body = smile(p.message);
  if (p.photo == 1) {
    // Largest resized version fitting in 800x600 (not the low quality 'l' ones).
    const dir = join(oldSite, 'photo/resized', String(p.id));
    const [w, h] = readdirSync(dir).map(f => f.match(/^(\d+)x(\d+)\.jpg$/)).filter(Boolean)
      .map(m => [+m[1], +m[2]]).filter(([w, h]) => w <= 800 && h <= 600).sort((a, b) => b[0] - a[0])[0];
    copyFileSync(join(dir, `${w}x${h}.jpg`), join(root, 'pict/www', `${p.id}.jpg`));
    // Shown at most 500px wide to fit in the theme's column.
    const [dw, dh] = w > 500 ? [500, Math.round(h * 500 / w)] : [w, h];
    body = `<p><img src="/pict/www/${p.id}.jpg" alt="${php(title)}" width="${dw}" height="${dh}" /></p>\n` + body;
  }
  const post = { title, content: body, dt: `${p.date} ${p.time}` };
  const kept = [];
  for (const c of comments.filter(c => c.post == p.id)) {
    const content = smile(c.message.trim());
    const r = spamCheck({ content, author: c.author, me: c.me, dt: `${c.date} ${c.time}` }, post);
    if (r.score >= 2) exclude.add(c.id);
    const hidden = exclude.has(c.id) && !keep.has(c.id);
    reviewed.push({ c, post: p, title, content, hidden, ...r });
    if (!hidden) kept.push({ ...c, content });
  }
  for (const m of (body + kept.map(c => c.content).join('')).matchAll(/src="\/smileys\/([^"]+)"/g))
    usedSmileys.add(decode(m[1]));

  const cat = cats[p.cat];
  const fm = [
    `title: ${str(title)}`,
    `date: ${p.date}T${p.time}`,
    `category: ${str(slug(cat.name))}`,
    p.author != 'florian' && `author: ${str(p.author[0].toUpperCase() + p.author.slice(1))}`,
    'lang: fr',
    // Not shown in listings, archives, feeds or previous/next links.
    'unlisted: true',
    'templateEngineOverride: html',
  ];
  if (kept.length) {
    fm.push('comments:');
    for (const c of kept)
      fm.push(`  - id: ${c.id}`, `    date: ${c.date}T${c.time}`, `    author: ${str(c.author)}`,
              ...(c.me ? ['    me: true'] : []), `    content: ${block(c.content, '      ')}`);
  }
  writeFileSync(join(root, 'posts', `${p.date}-${slug(title)}.md`),
                `---\n${fm.filter(Boolean).join('\n')}\n---\n${body}`);
}
for (const s of usedSmileys)
  if (!existsSync(join(root, 'smileys', s)))
    copyFileSync(join(oldSite, 'smileys', s), join(root, 'smileys', s));

const sortIds = s => [...s].sort((a, b) => a - b);
writeFileSync(filterFile, JSON.stringify({
  '//': 'Comment IDs hidden from the static site (likely spam), and IDs always shown. See import/floblog.mjs.',
  exclude: sortIds(exclude), keep: sortIds(keep),
}, null, 2) + '\n');
console.log(`${todo.length} posts written; ${reviewed.filter(r => !r.hidden).length} comments kept, ` +
            `${reviewed.filter(r => r.hidden).length} excluded; categories: ` +
            [...new Set(todo.map(p => cats[p.cat].name))].join(', '));

const output = process.argv[3];
if (output) {
  const item = r => `<div class="c">
  <p class="h"><b>#${r.c.id}</b> on <a href="https://blog.queze.net/post/${r.post.date.replace(/-/g, '/')}/${slug(r.title)}#c${r.c.id}">${php(r.title)}</a>
  — ${php(r.c.author)} — ${r.c.date} ${r.c.time}</p>
  <p class="why">${keep.has(r.c.id) ? 'forced to keep; ' : ''}${r.reasons.length ? `Score ${r.score}: ${r.reasons.map(php).join('; ')}` : 'No spam signal'}</p>
  <blockquote>${php(text(r.content))}</blockquote>
</div>`;
  writeFileSync(output, `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>blog.queze.net: comments of the posts imported from www.queze.net</title>
<style>
body { font-family: sans-serif; max-width: 60em; margin: 1em auto; padding: 0 1em; }
.c { border-top: 1px solid #ccc; padding: .3em 0; }
.h { margin: .3em 0; } .why { margin: .3em 0; color: #a00; font-size: .9em; }
blockquote { margin: .3em 1em; white-space: pre-wrap; color: #333; overflow-wrap: anywhere; }
</style></head><body>
<h1>Comments of the ${todo.length} posts imported from www.queze.net</h1>
<p>${reviewed.length} validated comments: ${reviewed.filter(r => !r.hidden).length} kept,
${reviewed.filter(r => r.hidden).length} excluded. To change a decision, edit
import/floblog-comment-filter.json ("keep" wins over "exclude"), then run import/floblog.mjs again.</p>
<h2>Excluded as likely spam (${reviewed.filter(r => r.hidden).length})</h2>
${reviewed.filter(r => r.hidden).map(item).join('\n')}
<h2>Kept (${reviewed.filter(r => !r.hidden).length})</h2>
${reviewed.filter(r => !r.hidden).map(item).join('\n')}
</body></html>
`);
  console.log('Review page written to', output);
}
