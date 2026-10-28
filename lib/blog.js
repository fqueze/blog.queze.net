// Turns the posts/*.md collection into what the templates need (listings,
// archives, feeds...), mimicking Dotclear 2.6's URLs, date formats and rules.
import { absoluteURLs, cutString, encode, escapeHTML, iso8601, rfc822, strftime, ts, tzOffset }
  from './dotclear.js';

const count = (n, what) => n == 0 ? `no ${what}` : n == 1 ? `one ${what}` : `${n} ${what}s`;
// YAML timestamps without timezone are read as UTC: get back the wall time.
const wallTime = d => d.toISOString().slice(0, 19).replace('T', ' ');
// Dotclear added rel="nofollow" to links in comments.
const nofollow = html => html.replace(/<a(.*?href=".*?".*?)>/gs,
  (m, attrs) => /rel="nofollow"/.test(attrs) ? m : `<a${attrs} rel="nofollow">`);

export function buildBlog(items, site) {
  const formatDate = dt => strftime(site.dateFormat, ts(dt));
  const formatTime = dt => strftime(site.timeFormat, ts(dt));

  // Categories; the parent of 'a/b' is 'a'.
  const cats = site.categories.map(c => ({ ...c, path: '/category/' + encode(c.url), posts: [] }));
  const catByUrl = Object.fromEntries(cats.map(c => [c.url, c]));
  for (const c of cats) {
    c.parent = catByUrl[c.url.replace(/\/?[^/]*$/, '')] || null;
    c.parents = c.parent ? [...c.parent.parents, c.parent] : [];
  }
  for (const c of cats)
    c.children = cats.filter(child => child.parent === c);

  // Posts, newest first.
  const allPosts = items.map(item => {
    const d = item.data;
    const dt = wallTime(item.date);
    const tz = d.timezone || site.timezone;
    const updTs = d.updated ? ts(wallTime(d.updated)) : null;
    const tzUpd = updTs && updTs + tzOffset(tz, updTs) * 1000;
    const path = '/post/' + encode(d.url);
    const base = d.http ? site.url : site.httpsUrl;
    if (d.category && !catByUrl[d.category])
      throw new Error(`${item.inputPath}: unknown category ${d.category}`);
    const comments = (d.comments || []).map((c, i) => {
      const name = escapeHTML(c.author);
      const cdt = wallTime(c.date);
      return {
        id: c.id,
        classes: `${c.me ? 'me' : ''} ${i % 2 == 0 ? 'odd' : ''} ${i == 0 ? 'first' : ''}`,
        content: nofollow(c.content),
        date: formatDate(cdt),
        time: formatTime(cdt),
        authorLink: c.site ? `<a href="${escapeHTML(c.site.trim())}" rel="nofollow">${name}</a>` : name,
      };
    });
    return {
      inputPath: item.inputPath,
      id: d.id ?? item.fileSlug,
      unlisted: !!d.unlisted,
      guid: d.guid || base + path,
      title: d.title,
      lang: d.lang || site.lang,
      path,
      absUrl: base + path,
      author: d.author || site.author.name,
      authorUrl: d.author ? null : site.author.url,
      category: catByUrl[d.category] || null,
      tags: (d.tags || []).map(t => ({ name: t, path: '/tag/' + encode(t) })),
      get content() { return item.templateContent; },
      get feedContent() { return '    ' + absoluteURLs(item.templateContent, base + path); },
      get description() {
        return cutString(item.templateContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
                         .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
                         .replace(/&amp;/g, '&').trim(), 180);
      },
      dt,
      day: dt.slice(0, 10),
      month: dt.slice(0, 7),
      date: formatDate(dt),
      time: formatTime(dt),
      iso: iso8601(ts(dt), tz),
      rfc822: rfc822(ts(dt), tz),
      updatedTs: tzUpd > ts(dt) ? tzUpd : ts(dt),
      updated: iso8601(tzUpd > ts(dt) ? tzUpd : ts(dt), tz),
      tz,
      comments,
      showComments: comments.length > 0 || !!d.comments_open,
      commentCount: count(comments.length, 'comment'),
    };
  }).sort((a, b) => b.dt.localeCompare(a.dt) || String(b.id).localeCompare(String(a.id), 'en', { numeric: true }));
  // Unlisted posts are only on their own page and their (unlisted) category's.
  const posts = allPosts.filter(p => !p.unlisted);
  posts.forEach((p, i) => {
    p.next = posts[i - 1] || null;
    p.prev = posts[i + 1] || null;
  });

  // Categories include the posts of their subcategories.
  for (const p of allPosts)
    if (p.category)
      for (const c of [...p.category.parents, p.category])
        if (!p.unlisted || c.unlisted) c.posts.push(p);

  // Tags, sorted case-insensitively like the Dotclear tags plugin.
  const tagMap = new Map();
  for (const p of posts)
    for (const t of p.tags) {
      if (!tagMap.has(t.name)) tagMap.set(t.name, { ...t, posts: [] });
      tagMap.get(t.name).posts.push(p);
    }
  const tags = [...tagMap.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const maxTag = Math.max(...tags.map(t => t.posts.length));
  for (const t of tags)
    t.percent = Math.round(t.posts.length / maxTag * 10) * 10;

  // Mark the entries that start a new day, and odd/first classes, for a listing.
  const listing = list => list.map((p, i) => ({
    post: p,
    newDay: i == 0 || list[i - 1].day != p.day,
    classes: `${i % 2 == 0 ? 'odd' : ''} ${i == 0 ? 'first' : ''}`,
  }));

  // Paginated listings: home, categories, tags.
  const lists = [];
  function paginate(base, list, extra) {
    const pages = Math.max(1, Math.ceil(list.length / site.postsPerPage));
    for (let n = 1; n <= pages; n++) {
      const pageUrl = k => k == 1 ? base || '/' : `${base}/page/${k}`;
      lists.push({
        ...extra,
        path: pageUrl(n),
        page: n,
        pages,
        prevPage: n < pages ? pageUrl(n + 1) : null,
        nextPage: n > 1 ? pageUrl(n - 1) : null,
        entries: listing(list.slice((n - 1) * site.postsPerPage, n * site.postsPerPage)),
      });
    }
  }
  paginate('', posts, { kind: 'home', feed: '/feed/atom' });
  for (const c of cats)
    if (c.posts.length)
      paginate(c.path, c.posts, { kind: 'category', category: c,
                                   feed: c.unlisted ? null : '/feed' + c.path + '/atom' });
  for (const t of tags)
    paginate(t.path, t.posts, { kind: 'tag', tag: t, feed: '/feed' + t.path + '/atom' });

  // Monthly archives, newest first.
  const months = [];
  for (const p of posts) {
    if (months.at(-1)?.month != p.month)
      months.push({
        month: p.month,
        year: p.month.slice(0, 4),
        label: strftime('%B %Y', ts(p.dt)),
        monthName: strftime('%B', ts(p.dt)),
        path: '/archive/' + p.month.replace('-', '/'),
        posts: [],
      });
    months.at(-1).posts.push(p);
  }
  months.forEach((m, i) => {
    m.next = months[i - 1] || null;
    m.prev = months[i + 1] || null;
    m.entries = listing(m.posts);
  });
  const years = [];
  for (const m of months) {
    if (years.at(-1)?.year != m.year) years.push({ year: m.year, months: [] });
    years.at(-1).months.push(m);
  }

  // Feeds. Dotclear's comment feeds (…/comments) can't exist in a static site:
  // /feed/atom would need to be both a file and a directory.
  const feeds = [];
  const addFeeds = (path, subtitle, list) =>
    feeds.push({ path: '/feed' + path, subtitle, posts: list.slice(0, site.postsPerFeed) });
  addFeeds('', '', posts);
  for (const c of cats)
    if (c.posts.length && !c.unlisted) addFeeds(c.path, ' - ' + c.title, c.posts);
  for (const t of tags)
    addFeeds(t.path, ' - Tag - ' + t.name, t.posts);

  // Last update: the Dotclear blog's, unless a newer post exists.
  const newest = posts.reduce((a, p) => p.updatedTs > a.updatedTs ? p : a,
                              { updatedTs: ts(site.updated), tz: site.updatedTimezone });

  // Categories widget, only listing categories having posts and not unlisted.
  const catTree = parent => cats
    .filter(c => c.parent === parent && c.posts.length && !c.unlisted)
    .map(c => ({ cat: c, children: catTree(c) }));

  return {
    posts,
    byInputPath: Object.fromEntries(allPosts.map(p => [p.inputPath, p])),
    lists,
    months,
    years,
    tags,
    feeds,
    updated: iso8601(newest.updatedTs, newest.tz),
    updatedRfc822: rfc822(newest.updatedTs, newest.tz),
    catTree: catTree(null),
    firstYear: posts.at(-1).dt.slice(0, 4),
    lastYear: posts[0].dt.slice(0, 4),
  };
}
