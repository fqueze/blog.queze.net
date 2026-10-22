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

const escapeHTML = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                                       .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const encode = s => encodeURIComponent(s).replace(/%2F/g, '/');

const filterFile = join(import.meta.dirname, 'comment-filter.json');
const { posts, comments } = JSON.parse(readFileSync(join(import.meta.dirname, 'dotclear.json'), 'utf8'));
const filter = existsSync(filterFile) ? JSON.parse(readFileSync(filterFile, 'utf8'))
                                      : { exclude: [], keep: [] };
const postById = Object.fromEntries(posts.map(p => [p.id, p]));

const text = html => (html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ')
                                 .replace(/\s+/g, ' ').trim();
const STOP = new Set(('about above after again against because before being below between could ' +
  'doing during every first further having other really should their theirs there these ' +
  'those through under until where which while would yours always never still since ' +
  'think thing things people something'). split(' '));
const words = s => new Set((s.toLowerCase().match(/\p{L}{5,}/gu) || []).filter(w => !STOP.has(w)));

const KEYWORDS = /\b(casino|poker|slots?|betting|viagra|cialis|pharma\w*|adult|nude|porn\w*|sex\w*|webcams?|escort|lingerie|dating|loans?|insurance|dentist|replica|crypto|bitcoin|forex|vpn|torrent|seo|download)\b/gi;
const PHRASES = /(resist commenting|perfectly written|surfing online|worth enough for me|webmasters and bloggers|great article|nice post|keep up the good work|thanks for sharing|url=\[|\[url)/gi;
const SUSPICIOUS_URL = /(facebook\.com|youtube\.com|drive\.google\.com|goo\.gl|bit\.ly|duckdns|\.xyz\b|\.vin\b|lnwshop|wordpress\.com\/\d{4}|^https?:\/\/\d+\.\d+\.\d+\.\d+)/i;

function check(c) {
  const reasons = [];
  let score = 0;
  const add = (points, reason) => { score += points; reasons.push(reason); };
  if (c.me) return { score, reasons };
  const post = postById[c.post_id];
  const body = text(c.content);

  const links = (c.content.match(/<a\s/g) || []).length;
  if (links >= 10) add(3, `${links} links`);
  else if (links >= 3) add(1, `${links} links`);

  const keywords = [...new Set([...(body + ' ' + c.author).matchAll(KEYWORDS)].map(m => m[0].toLowerCase()))];
  if (keywords.length) add(2, `spam keywords: ${keywords.join(', ')}`);

  const phrases = [...new Set([...c.content.matchAll(PHRASES)].map(m => m[0].toLowerCase()))];
  if (phrases.length) add(2, `spam phrases: ${phrases.join(', ')}`);

  const site = (c.site || '').trim();
  if (site && (/^[\p{Ll}\d]+( [\p{Ll}\d]+)?$/u.test(c.author) ||
               /\.\w{2,4}$|^\d+\.\d+\.\d+\.\d+$/.test(c.author)))
    add(1, `generic author name with a website: ${c.author}`);
  if (site && SUSPICIOUS_URL.test(site))
    add(1, `suspicious author URL: ${site}`);
  else if (site && new URL(site).pathname.length > 30)
    add(1, `author URL to a deep page: ${site}`);

  const commentWords = words(body);
  if (commentWords.size >= 8) {
    const postWords = words(post.title + ' ' + text(post.content));
    const shared = [...commentWords].filter(w => postWords.has(w)).length;
    if (shared / commentWords.size < 0.15)
      add(1, `unrelated to the post (${shared}/${commentWords.size} words in common)`);
  }

  const years = (Date.parse(c.dt) - Date.parse(post.dt)) / (365.25 * 24 * 3600 * 1000);
  if (years > 2) add(1, `posted ${Math.floor(years)} years after the post`);

  return { score, reasons };
}

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
