// Drafts (draft/<slug>/index.md), reviewed with draft/review-mode.js and
// published to posts/. Only used by `npm run serve`.
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import site from '../_data/site.js';

const imageRe = /\.(jpe?g|png|gif|webp|svg)$/i;

// draft/<slug>/data.json holds the review comments, and the publication.
export function loadDraftData(slug) {
  try {
    return JSON.parse(readFileSync(join('draft', slug, 'data.json'), 'utf-8'));
  } catch {
    return { comments: [] };
  }
}

function saveDraftData(slug, data) {
  writeFileSync(join('draft', slug, 'data.json'), JSON.stringify(data, null, 2) + '\n');
}

// Paris wall time, as in the 'date' of posts: 2027-01-31T14:00:00.
function localNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: site.timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date()).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
}

// Writes posts/<date>-<slug>.md dated now, and copies the images to pict/.
function publishDraft(slug) {
  const dir = join('draft', slug);
  const published = loadDraftData(slug).post;
  if (published)
    throw new Error(`Already published as ${published}`);
  const source = readFileSync(join(dir, 'index.md'), 'utf-8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match)
    throw new Error('Missing front matter');
  let [, frontMatter, body] = match;
  const todos = body.match(/TODO:/g);
  if (todos)
    throw new Error(`${todos.length} TODO marker(s) left in the draft`);

  const date = localNow();
  const postPath = join('posts', `${date.slice(0, 10)}-${slug}.md`);
  if (existsSync(postPath))
    throw new Error(`${postPath} already exists`);

  // Images are referenced by their file name in the draft, and from /pict/ in posts.
  const images = readdirSync(dir).filter(f => imageRe.test(f));
  for (const image of images) {
    const dest = join('pict', image);
    if (existsSync(dest) && !readFileSync(dest).equals(readFileSync(join(dir, image))))
      throw new Error(`${dest} already exists`);
  }
  for (const image of images) {
    copyFileSync(join(dir, image), join('pict', image));
    const name = image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    body = body.replace(new RegExp(`(\\]\\(|src=")(\\./)?${name}(?=[)"\\s])`, 'g'), `$1/pict/${image}`);
  }

  frontMatter = frontMatter.split('\n').filter(line => !/^date:/.test(line))
    .map(line => /^title:/.test(line) ? `${line}\ndate: ${date}` : line).join('\n');
  writeFileSync(postPath, `---\n${frontMatter}\n---\n${body}`);

  const url = `/post/${date.slice(0, 10).replaceAll('-', '/')}/${slug}`;
  const data = loadDraftData(slug);
  Object.assign(data, { published: new Date().toISOString(), post: postPath, url });
  saveDraftData(slug, data);

  const title = frontMatter.match(/^title:\s*(.*)$/m)?.[1] ?? slug;
  return {
    post: postPath,
    url,
    gitCommands: [
      `git add ${postPath} draft/${slug} ${images.map(i => join('pict', i)).join(' ')}`.trim(),
      `git commit -m 'Add the "${title.replace(/^["']|["']$/g, '').replaceAll("'", "'\\''")}" post'`,
      'git push',
    ],
  };
}

// Dev server middleware for the draft API.
export function draftMiddleware(req, res, next) {
  const match = req.url.match(/^\/api\/draft\/([\w-]+)\/(data|comments|publish)$/);
  if (!match || !existsSync(join('draft', match[1], 'index.md')))
    return next();
  const [, slug, action] = match;
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  if (req.method == 'GET' && action == 'data')
    return send(200, loadDraftData(slug));

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      if (req.method == 'PATCH' && action == 'comments') {
        const data = loadDraftData(slug);
        data.comments = JSON.parse(body).comments || [];
        saveDraftData(slug, data);
        send(200, { success: true });
      } else if (req.method == 'POST' && action == 'publish') {
        send(200, publishDraft(slug));
      } else {
        send(405, { error: 'Method not allowed' });
      }
    } catch (error) {
      send(500, { error: error.message });
    }
  });
}
