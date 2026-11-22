// Drafts, reviewed with draft/review-mode.js and published to posts/. Only
// used by `npm run serve`. A draft <name> is draft/<name>.md or
// draft/<name>/index.md; draft/<name>/ also holds its images and data.json.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync }
  from 'node:fs';
import { join } from 'node:path';
import site from '../_data/site.js';

const imageRe = /\.(jpe?g|png|gif|webp|svg)$/i;

function draftSource(name) {
  return [join('draft', name + '.md'), join('draft', name, 'index.md')].find(existsSync);
}

// draft/<name>/data.json holds the review comments, and the publication.
export function loadDraftData(name) {
  try {
    return JSON.parse(readFileSync(join('draft', name, 'data.json'), 'utf-8'));
  } catch {
    return { comments: [] };
  }
}

function saveDraftData(name, data) {
  mkdirSync(join('draft', name), { recursive: true });
  writeFileSync(join('draft', name, 'data.json'), JSON.stringify(data, null, 2) + '\n');
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
// The draft name may have a date prefix, like posts: it's replaced by today.
function publishDraft(name) {
  const dir = join('draft', name);
  const published = loadDraftData(name).post;
  if (published)
    throw new Error(`Already published as ${published}`);
  const sourcePath = draftSource(name);
  const source = readFileSync(sourcePath, 'utf-8');
  const slug = name.replace(/^\d{4}-\d\d-\d\d-/, '');
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
  const images = existsSync(dir) ? readdirSync(dir).filter(f => imageRe.test(f)) : [];
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
  const data = loadDraftData(name);
  Object.assign(data, { published: new Date().toISOString(), post: postPath, url });
  saveDraftData(name, data);

  const title = frontMatter.match(/^title:\s*(.*)$/m)?.[1] ?? slug;
  return {
    post: postPath,
    url,
    gitCommands: [
      `git add ${postPath} ${sourcePath} ${dir} ${images.map(i => join('pict', i)).join(' ')}`.trim(),
      `git commit -m 'Add the "${title.replace(/^["']|["']$/g, '').replaceAll("'", "'\\''")}" post'`,
      'git push',
    ],
  };
}

// Dev server middleware for the draft API.
export function draftMiddleware(req, res, next) {
  const match = req.url.match(/^\/api\/draft\/([\w-]+)\/(data|comments|publish)$/);
  if (!match || !draftSource(match[1]))
    return next();
  const [, name, action] = match;
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  if (req.method == 'GET' && action == 'data')
    return send(200, loadDraftData(name));

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      if (req.method == 'PATCH' && action == 'comments') {
        const data = loadDraftData(name);
        data.comments = JSON.parse(body).comments || [];
        saveDraftData(name, data);
        send(200, { success: true });
      } else if (req.method == 'POST' && action == 'publish') {
        send(200, publishDraft(name));
      } else {
        send(405, { error: 'Method not allowed' });
      }
    } catch (error) {
      send(500, { error: error.message });
    }
  });
}
