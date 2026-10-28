// Flag likely spam among the published comments of import/dotclear.json.
//
// Comments flagged by the heuristics below are added to the "exclude" list of
// import/comment-filter.json. IDs listed in its "keep" list are always shown,
// so false positives are fixed by adding them there (re-running this script
// never removes IDs from either list).
//
// Usage: node import/review-comments.mjs [review.html]
// Writes an HTML page listing excluded and kept comments, with the reasons.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spamCheck, text } from './spam.mjs';

const escapeHTML = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                                       .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const encode = s => encodeURIComponent(s).replace(/%2F/g, '/');

const filterFile = join(import.meta.dirname, 'comment-filter.json');
const { posts, comments } = JSON.parse(readFileSync(join(import.meta.dirname, 'dotclear.json'), 'utf8'));
const filter = existsSync(filterFile) ? JSON.parse(readFileSync(filterFile, 'utf8'))
                                      : { exclude: [], keep: [] };
const postById = Object.fromEntries(posts.map(p => [p.id, p]));

const check = c => spamCheck(c, postById[c.post_id]);

const exclude = new Set(filter.exclude);
const keep = new Set(filter.keep);
const results = comments.map(c => ({ c, ...check(c) }));
for (const r of results)
  if (r.score >= 2) exclude.add(r.c.id);
const sortIds = s => [...s].sort((a, b) => a - b);
writeFileSync(filterFile, JSON.stringify({
  '//': 'Comment IDs hidden from the static site (likely spam), and IDs always shown. ' +
        'See import/review-comments.mjs.',
  exclude: sortIds(exclude),
  keep: sortIds(keep),
}, null, 2) + '\n');

const excluded = results.filter(r => exclude.has(r.c.id) && !keep.has(r.c.id));
const kept = results.filter(r => !excluded.includes(r));
console.log(`${kept.length} comments kept, ${excluded.length} excluded`);

const output = process.argv[2];
if (output) {
  const item = ({ c, score, reasons }) => {
    const post = postById[c.post_id];
    const body = text(c.content);
    const why = [...reasons];
    if (keep.has(c.id)) why.unshift('forced to keep (comment-filter.json "keep")');
    else if (exclude.has(c.id) && score < 2) why.unshift('listed in comment-filter.json "exclude"');
    return `<div class="c">
  <p class="h"><b>#${c.id}</b> on <a href="https://blog.queze.net/post/${encode(post.url)}#c${c.id}">${escapeHTML(post.title)}</a>
  — ${c.site ? `<a href="${escapeHTML(c.site)}" rel="nofollow">${escapeHTML(c.author)}</a> &lt;${escapeHTML(c.site)}&gt;` : escapeHTML(c.author)}
  — ${c.dt}</p>
  <p class="why">${why.length ? `Score ${score}: ${why.map(escapeHTML).join('; ')}` : 'No spam signal'}</p>
  <blockquote>${escapeHTML(body.length > 1500 ? body.slice(0, 1500) + ' […]' : body)}</blockquote>
</div>`;
  };
  writeFileSync(output, `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>blog.queze.net comments review</title>
<style>
body { font-family: sans-serif; max-width: 60em; margin: 1em auto; padding: 0 1em; }
.c { border-top: 1px solid #ccc; padding: .3em 0; }
.h { margin: .3em 0; } .why { margin: .3em 0; color: #a00; font-size: .9em; }
blockquote { margin: .3em 1em; white-space: pre-wrap; color: #333; overflow-wrap: anywhere; }
</style></head><body>
<h1>blog.queze.net comments review</h1>
<p>${results.length} published comments: ${kept.length} kept, ${excluded.length} excluded.
To change a decision, edit import/comment-filter.json ("keep" wins over "exclude"), then run import/convert.mjs again.</p>
<h2>Excluded as likely spam (${excluded.length})</h2>
${excluded.map(item).join('\n')}
<h2>Kept (${kept.length})</h2>
${kept.map(item).join('\n')}
</body></html>
`);
  console.log('Review page written to', output);
}
