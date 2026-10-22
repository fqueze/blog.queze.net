// Export the public content of the old Dotclear blog to import/dotclear.json,
// and copy the media it references (plus the theme assets) to the site.
//
// Usage: MYSQL="mysql --defaults-file=... -uroot dotclear_db" \
//          node import/export-data.mjs /path/to/dotclear
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dotclear = process.argv[2];
if (!process.env.MYSQL || !dotclear) {
  console.error('Usage: MYSQL="mysql [options] database" node import/export-data.mjs <dotclear dir>');
  process.exit(1);
}
const root = join(import.meta.dirname, '..');
const blogId = process.env.BLOG_ID || 'default';

function query(sql) {
  const [cmd, ...args] = process.env.MYSQL.split(/\s+/);
  const out = execFileSync(cmd, [...args, '--default-character-set=utf8mb4', '-N', '-B', '-r', '-e', sql],
                           { encoding: 'utf8', maxBuffer: 1 << 30 });
  return JSON.parse(out.trim() || 'null') || [];
}
const q = s => `'${s.replace(/'/g, "''")}'`;
const date = col => `DATE_FORMAT(${col}, '%Y-%m-%d %H:%i:%s')`;

const [blog] = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'id', blog_id, 'uid', blog_uid, 'name', blog_name, 'desc', blog_desc,
  'upddt', ${date('blog_upddt')})) FROM dc_blog WHERE blog_id = ${q(blogId)}`);

// Blog settings override global ones.
const wanted = ['lang', 'blog_timezone', 'date_format', 'time_format', 'nb_post_per_page', 'nb_post_per_feed',
                'allow_comments', 'allow_trackbacks', 'comments_ttl', 'trackbacks_ttl',
                'inc_subcats', 'comments_nofollow', 'copyright_notice'];
blog.settings = {};
for (const s of query(`SELECT JSON_ARRAYAGG(JSON_OBJECT('ns', setting_ns, 'id', setting_id,
    'value', setting_value, 'global', blog_id IS NULL)) FROM dc_setting
    WHERE setting_ns = 'system' AND setting_id IN (${wanted.map(q)})
    AND (blog_id IS NULL OR blog_id = ${q(blogId)})`)
  .sort((a, b) => b.global - a.global))
  blog.settings[s.id] = s.value;
blog.settings = Object.fromEntries(wanted.map(k => [k, blog.settings[k]]));

const users = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT('id', user_id, 'name', user_name,
  'firstname', user_firstname, 'displayname', user_displayname, 'url', user_url))
  FROM dc_user WHERE user_id IN (SELECT user_id FROM dc_post WHERE blog_id = ${q(blogId)})`)
  .sort((a, b) => a.id.localeCompare(b.id));

const categories = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cat_id, 'title', cat_title,
  'url', cat_url, 'desc', cat_desc, 'lft', cat_lft, 'rgt', cat_rgt))
  FROM dc_category WHERE blog_id = ${q(blogId)}`).sort((a, b) => a.lft - b.lft);

const published = `post_status = 1 AND post_type = 'post' AND blog_id = ${q(blogId)}`;
const posts = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'id', post_id, 'guid', CONCAT('urn:md5:', MD5(CONCAT(${q(blog.uid)}, post_id))),
  'user_id', user_id, 'cat_id', cat_id, 'dt', ${date('post_dt')}, 'tz', post_tz,
  'upddt', ${date('post_upddt')}, 'url', post_url, 'lang', post_lang, 'title', post_title,
  'excerpt', post_excerpt_xhtml, 'content', post_content_xhtml,
  'open_comment', post_open_comment, 'open_tb', post_open_tb,
  'nb_comment', nb_comment, 'nb_trackback', nb_trackback,
  'tags', (SELECT JSON_ARRAYAGG(meta_id) FROM dc_meta m
           WHERE m.post_id = p.post_id AND meta_type = 'tag')))
  FROM dc_post p WHERE ${published}`)
  .sort((a, b) => b.dt.localeCompare(a.dt) || b.id - a.id);
for (const p of posts)
  p.tags = (p.tags || []).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

// 'me' marks comments written by the post author (Dotclear's CommentIfMe);
// email addresses themselves are not exported.
const comments = query(`SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'id', comment_id, 'guid', CONCAT('urn:md5:', MD5(CONCAT(${q(blog.uid)}, comment_id))),
  'post_id', c.post_id, 'dt', ${date('comment_dt')}, 'tz', comment_tz,
  'author', comment_author, 'site', comment_site, 'content', comment_content,
  'trackback', comment_trackback,
  'me', comment_email <> '' AND comment_site <> '' AND comment_email = u.user_email
        AND comment_site = u.user_url))
  FROM dc_comment c JOIN dc_post p ON p.post_id = c.post_id JOIN dc_user u ON u.user_id = p.user_id
  WHERE comment_status = 1 AND ${published.replace(/post_|blog_id/g, m => 'p.' + m)}`)
  .sort((a, b) => a.dt.localeCompare(b.dt) || a.id - b.id);
for (const c of comments)
  c.me = !!c.me;

writeFileSync(join(import.meta.dirname, 'dotclear.json'),
              JSON.stringify({ blog, users, categories, posts, comments }, null, 2) + '\n');

// Media referenced by posts and comments, e.g. /pict/foo.png or http://blog.queze.net/smileys/bar.png
const media = new Set();
for (const html of [...posts.flatMap(p => [p.content, p.excerpt]), ...comments.map(c => c.content)])
  for (const m of (html || '').matchAll(/(?:src|href)="(?:https?:\/\/blog\.queze\.net)?\/?((?:pict|smileys|public)\/[^"#?]+)"/g))
    media.add(decodeURIComponent(m[1]));
// Theme assets.
media.add('themes/default/style.css').add('themes/default/print.css')
     .add('themes/default/img').add('themes/default/js')
     .add('public/blowup-css').add('public/blowup-images');

for (const dir of ['pict', 'smileys', 'public', 'themes'])
  rmSync(join(root, dir), { recursive: true, force: true });
for (const path of [...media].sort()) {
  const from = join(dotclear, path);
  if (!existsSync(from)) {
    console.warn('missing media:', path);
    continue;
  }
  mkdirSync(dirname(join(root, path)), { recursive: true });
  cpSync(from, join(root, path), { recursive: true });
}
console.log(`${posts.length} posts, ${comments.length} comments, ${media.size} media paths`);
